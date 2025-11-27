/**
 * OpenAPI/Swagger Documentation for DotRep REST API
 */

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'DotRep REST API',
    version: '1.0.0',
    description: 'RESTful API for DotRep decentralized reputation system. Provides endpoints for reputation management, DKG operations, trust layer, and Polkadot integration.',
    contact: {
      name: 'DotRep Team',
      url: 'https://dotrep.io'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Local development server'
    },
    {
      url: 'https://api.dotrep.io/api',
      description: 'Production server'
    }
  ],
  tags: [
    { name: 'Health', description: 'Health check and API information' },
    { name: 'DKG', description: 'OriginTrail DKG operations' },
    { name: 'Reputation', description: 'Reputation asset management' },
    { name: 'Payment', description: 'Payment evidence operations' },
    { name: 'Trust', description: 'Trust layer and staking' },
    { name: 'Polkadot', description: 'Polkadot chain operations' },
    { name: 'Contributors', description: 'Contributor management' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the health status of the API',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                    service: { type: 'string', example: 'dotrep-api' },
                    version: { type: 'string', example: '1.0.0' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api': {
      get: {
        tags: ['Health'],
        summary: 'API information',
        description: 'Returns API information and available endpoints',
        responses: {
          '200': {
            description: 'API information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    version: { type: 'string' },
                    description: { type: 'string' },
                    endpoints: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/v1/dkg/node/info': {
      get: {
        tags: ['DKG'],
        summary: 'Get DKG node information',
        description: 'Retrieves information about the connected DKG node',
        responses: {
          '200': {
            description: 'Node information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/v1/dkg/health': {
      get: {
        tags: ['DKG'],
        summary: 'Check DKG health',
        description: 'Checks the health of the DKG connection',
        responses: {
          '200': {
            description: 'DKG health status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    healthy: { type: 'boolean' },
                    status: {
                      type: 'object',
                      properties: {
                        initialized: { type: 'boolean' },
                        environment: { type: 'string' },
                        endpoint: { type: 'string' },
                        mockMode: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/v1/dkg/query': {
      post: {
        tags: ['DKG'],
        summary: 'Execute SPARQL query',
        description: 'Executes a SPARQL query on the DKG graph',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['query'],
                properties: {
                  query: {
                    type: 'string',
                    description: 'SPARQL query string',
                    example: 'PREFIX schema: <https://schema.org/> SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10'
                  },
                  queryType: {
                    type: 'string',
                    enum: ['SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE'],
                    default: 'SELECT'
                  },
                  allowUpdates: {
                    type: 'boolean',
                    default: false,
                    description: 'Allow UPDATE queries (default: false)'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Query results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad request - invalid query'
          }
        }
      }
    },
    '/v1/reputation': {
      post: {
        tags: ['Reputation'],
        summary: 'Publish reputation asset',
        description: 'Publishes a reputation asset to the DKG',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['developerId', 'reputationScore'],
                properties: {
                  developerId: {
                    type: 'string',
                    description: 'Developer identifier',
                    example: 'alice'
                  },
                  reputationScore: {
                    type: 'number',
                    description: 'Reputation score (0-1000)',
                    minimum: 0,
                    maximum: 1000,
                    example: 850
                  },
                  contributions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        type: { type: 'string', enum: ['github_pr', 'github_commit', 'gitlab_mr', 'other'] },
                        url: { type: 'string' },
                        title: { type: 'string' },
                        date: { type: 'string', format: 'date-time' },
                        impact: { type: 'number' }
                      }
                    }
                  },
                  timestamp: {
                    type: 'number',
                    description: 'Unix timestamp (default: current time)'
                  },
                  metadata: {
                    type: 'object',
                    description: 'Additional metadata'
                  },
                  previousVersionUAL: {
                    type: 'string',
                    description: 'UAL of previous version for updates'
                  },
                  epochs: {
                    type: 'number',
                    default: 2,
                    description: 'Number of epochs to store'
                  },
                  validateSchema: {
                    type: 'boolean',
                    default: true
                  },
                  walletAddress: {
                    type: 'string',
                    description: 'Wallet address for token verification (if token gating enabled)'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Reputation asset published successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        ual: { type: 'string' },
                        transactionHash: { type: 'string' },
                        blockNumber: { type: 'number' },
                        costEstimate: {
                          type: 'object',
                          properties: {
                            tracFee: { type: 'string' },
                            neuroGasFee: { type: 'string' },
                            totalCostUSD: { type: 'number' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad request - missing required fields'
          }
        }
      }
    },
    '/v1/reputation/{ual}': {
      get: {
        tags: ['Reputation'],
        summary: 'Query reputation by UAL',
        description: 'Retrieves a reputation asset by its Uniform Asset Locator (UAL)',
        parameters: [
          {
            name: 'ual',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Uniform Asset Locator'
          }
        ],
        responses: {
          '200': {
            description: 'Reputation asset',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'object' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Reputation asset not found'
          }
        }
      }
    },
    '/v1/reputation/search': {
      get: {
        tags: ['Reputation'],
        summary: 'Search reputation assets',
        description: 'Searches for reputation assets by developer ID',
        parameters: [
          {
            name: 'developerId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Developer identifier'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
            description: 'Maximum number of results'
          }
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array' },
                    count: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/v1/payment-evidence': {
      post: {
        tags: ['Payment'],
        summary: 'Publish payment evidence',
        description: 'Publishes payment evidence as a Knowledge Asset to DKG',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['txHash', 'payer', 'recipient', 'amount', 'currency', 'chain'],
                properties: {
                  txHash: { type: 'string', description: 'Transaction hash' },
                  payer: { type: 'string', description: 'Payer address or DID' },
                  recipient: { type: 'string', description: 'Recipient address or DID' },
                  amount: { type: 'string', description: 'Payment amount' },
                  currency: { type: 'string', description: 'Currency code (e.g., USDC)' },
                  chain: { type: 'string', description: 'Blockchain name (e.g., base, ethereum)' },
                  resourceUAL: { type: 'string', description: 'UAL of the resource being paid for' },
                  challenge: { type: 'string', description: 'Payment challenge identifier' },
                  epochs: { type: 'number', default: 2 },
                  validateSchema: { type: 'boolean', default: true }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Payment evidence published successfully'
          }
        }
      },
      get: {
        tags: ['Payment'],
        summary: 'Query payment evidence',
        description: 'Queries payment evidence with filters',
        parameters: [
          { name: 'payer', in: 'query', schema: { type: 'string' } },
          { name: 'recipient', in: 'query', schema: { type: 'string' } },
          { name: 'minAmount', in: 'query', schema: { type: 'number' } },
          { name: 'chain', in: 'query', schema: { type: 'string' } },
          { name: 'resourceUAL', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } }
        ],
        responses: {
          '200': {
            description: 'Payment evidence results'
          }
        }
      }
    },
    '/v1/trust/stake': {
      post: {
        tags: ['Trust'],
        summary: 'Stake tokens',
        description: 'Stakes tokens for trust layer participation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userDID', 'amount'],
                properties: {
                  userDID: { type: 'string', description: 'User DID' },
                  amount: { type: 'string', description: 'Amount to stake (as string for BigInt)' },
                  targetTier: {
                    type: 'string',
                    enum: ['BASIC', 'VERIFIED', 'PREMIUM', 'ELITE'],
                    description: 'Target trust tier'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Tokens staked successfully'
          }
        }
      }
    },
    '/v1/trust/score/{userDID}': {
      get: {
        tags: ['Trust'],
        summary: 'Get trust score',
        description: 'Gets the trust score for a user',
        parameters: [
          {
            name: 'userDID',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Trust score'
          }
        }
      }
    },
    '/v1/polkadot/reputation/{accountId}': {
      get: {
        tags: ['Polkadot'],
        summary: 'Get Polkadot reputation',
        description: 'Gets reputation from the Polkadot chain',
        parameters: [
          {
            name: 'accountId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Reputation data'
          }
        }
      }
    },
    '/v1/contributors': {
      get: {
        tags: ['Contributors'],
        summary: 'List contributors',
        description: 'Lists all contributors',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 1000 }
          }
        ],
        responses: {
          '200': {
            description: 'List of contributors'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              cause: { type: 'string' }
            }
          }
        }
      },
      ReputationAsset: {
        type: 'object',
        required: ['developerId', 'reputationScore'],
        properties: {
          developerId: { type: 'string' },
          reputationScore: { type: 'number', minimum: 0, maximum: 1000 },
          contributions: {
            type: 'array',
            items: { $ref: '#/components/schemas/Contribution' }
          },
          timestamp: { type: 'number' },
          metadata: { type: 'object' }
        }
      },
      Contribution: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['github_pr', 'github_commit', 'gitlab_mr', 'other'] },
          url: { type: 'string' },
          title: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          impact: { type: 'number' }
        }
      }
    },
    responses: {
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      }
    }
  }
};

