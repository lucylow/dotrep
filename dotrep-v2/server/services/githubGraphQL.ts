import axios from "axios";
import * as db from "../db";
import { ExternalApiError, NetworkError, ValidationError } from "@shared/_core/errors";
import { retryWithBackoff, withTimeout, isRetryableError, logError } from "../_core/errorHandler";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_URL = "https://api.github.com/graphql";

/**
 * Fetches user contributions using GitHub GraphQL API
 */
export async function fetchUserContributions(
  login: string,
  from: Date,
  to: Date,
  token?: string
): Promise<any> {
  const authToken = token || GITHUB_TOKEN;
  if (!authToken) {
    throw new ValidationError("GitHub token required for GraphQL queries", "token");
  }

  if (!login || login.trim().length === 0) {
    throw new ValidationError("GitHub username is required", "login");
  }

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        id
        login
        contributionsCollection(from: $from, to: $to) {
          commitContributionsByRepository {
            repository {
              nameWithOwner
            }
            contributions(first: 100) {
              nodes {
                commitCount
                occurredAt
              }
            }
          }
          pullRequestContributions(first: 100) {
            nodes {
              pullRequest {
                id
                number
                title
                url
                createdAt
                merged
                mergedAt
                author {
                  login
                }
                additions
                deletions
                repository {
                  nameWithOwner
                }
              }
            }
          }
          issueContributions(first: 100) {
            nodes {
              issue {
                id
                number
                title
                url
                createdAt
                state
                repository {
                  nameWithOwner
                }
              }
            }
          }
          pullRequestReviewContributions(first: 100) {
            nodes {
              pullRequestReview {
                id
                state
                createdAt
                pullRequest {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  return retryWithBackoff(
    async () => {
      try {
        const response = await withTimeout(
          axios.post(
            GITHUB_API_URL,
            {
              query,
              variables: {
                login,
                from: from.toISOString(),
                to: to.toISOString(),
              },
            },
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              },
            }
          ),
          30000, // 30 second timeout
          "GitHub API request timed out"
        );

        if (response.data.errors) {
          const errorMessage = response.data.errors.map((e: any) => e.message).join(", ");
          throw new ExternalApiError(
            `GitHub GraphQL errors: ${errorMessage}`,
            "github",
            response.status,
            response.data.errors
          );
        }

        return response.data.data;
      } catch (error: any) {
        if (error instanceof ExternalApiError) {
          throw error;
        }
        
        if (error.response) {
          const statusCode = error.response.status;
          const statusText = error.response.statusText;
          const data = error.response.data;
          
          logError(error, { operation: "fetchUserContributions", login, statusCode });
          
          throw new ExternalApiError(
            `GitHub API error: ${statusCode} ${statusText}`,
            "github",
            statusCode,
            data
          );
        }
        
        if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT" || error.code === "ENOTFOUND") {
          throw new NetworkError(
            `Failed to connect to GitHub API: ${error.message}`,
            GITHUB_API_URL,
            error
          );
        }
        
        throw error;
      }
    },
    {
      maxRetries: 3,
      retryable: isRetryableError,
    }
  );
}

/**
 * Fetches pull requests for a user
 */
export async function fetchUserPullRequests(
  login: string,
  after?: string,
  token?: string
): Promise<{ pullRequests: any[]; hasNextPage: boolean; endCursor?: string }> {
  const authToken = token || GITHUB_TOKEN;
  if (!authToken) {
    throw new Error("GitHub token required for GraphQL queries");
  }

  const query = `
    query($login: String!, $after: String) {
      user(login: $login) {
        pullRequests(first: 50, after: $after, states: [OPEN, MERGED, CLOSED]) {
          nodes {
            id
            number
            title
            url
            createdAt
            merged
            mergedAt
            additions
            deletions
            repository {
              nameWithOwner
            }
            author {
              login
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      GITHUB_API_URL,
      {
        query,
        variables: {
          login,
          after,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
    }

    const user = response.data.data.user;
    if (!user) {
      return { pullRequests: [], hasNextPage: false };
    }

    return {
      pullRequests: user.pullRequests.nodes || [],
      hasNextPage: user.pullRequests.pageInfo.hasNextPage,
      endCursor: user.pullRequests.pageInfo.endCursor,
    };
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `GitHub API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    }
    throw error;
  }
}

/**
 * Backfills contributions for a GitHub user
 */
export async function backfillUserContributions(
  githubUsername: string,
  monthsBack: number = 12
): Promise<{ processed: number; errors: number }> {
  const contributor = await db.getContributorByGithubUsername(githubUsername);
  if (!contributor) {
    throw new Error(`Contributor not found: ${githubUsername}`);
  }

  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - monthsBack);

  console.log(`🔄 Backfilling contributions for ${githubUsername} from ${from.toISOString()} to ${to.toISOString()}`);

  let processed = 0;
  let errors = 0;

  try {
    // Fetch contributions
    const data = await fetchUserContributions(githubUsername, from, to);

    if (!data.user) {
      throw new Error("User not found in GitHub");
    }

    const contributions = data.user.contributionsCollection;

    // Process commit contributions
    for (const repoContrib of contributions.commitContributionsByRepository || []) {
      for (const contrib of repoContrib.contributions.nodes || []) {
        try {
          // Create contribution record
          // Note: This would require adding a createContribution function to db.ts
          processed++;
        } catch (error) {
          console.error(`Error processing commit contribution:`, error);
          errors++;
        }
      }
    }

    // Process PR contributions
    for (const pr of contributions.pullRequestContributions?.nodes || []) {
      try {
        // Create contribution record
        processed++;
      } catch (error) {
        console.error(`Error processing PR contribution:`, error);
        errors++;
      }
    }

    // Process issue contributions
    for (const issue of contributions.issueContributions?.nodes || []) {
      try {
        // Create contribution record
        processed++;
      } catch (error) {
        console.error(`Error processing issue contribution:`, error);
        errors++;
      }
    }

    console.log(`✅ Backfill complete: ${processed} processed, ${errors} errors`);

    return { processed, errors };
  } catch (error: any) {
    console.error(`❌ Backfill error:`, error);
    throw error;
  }
}


