/**
 * Community Notes Service
 * 
 * Implements Community Notes for misinformation defense:
 * - Publish corrections and verifications to DKG
 * - Link to target UALs (Knowledge Assets)
 * - Include evidence and reasoning
 * - Track author reputation
 * - Enable agent-driven corrections
 * 
 * This demonstrates real-world value for misinformation defense
 * and transparent data economy.
 */

import { DKGClientV8, DKGConfig } from './dkg-client-v8';
import { getImpactMetrics } from '../server/_core/impactMetrics';
import { getPolkadotApi } from '../server/_core/polkadotApi';

export interface CommunityNote {
  id?: string;
  targetUAL: string; // UAL of the Knowledge Asset being corrected/verified
  noteType: 'misinformation' | 'correction' | 'verification' | 'other';
  content: string;
  author: string; // Account ID or agent identifier
  authorReputation?: number;
  evidence: string[]; // Array of UALs or URLs providing evidence
  reasoning: string;
  timestamp: number;
  ual?: string; // UAL of this Community Note (after publishing)
}

export interface CommunityNoteResult {
  note: CommunityNote;
  ual: string;
  transactionHash?: string;
  blockNumber?: number;
  published: boolean;
}

/**
 * Community Notes Service
 */
export class CommunityNotesService {
  private dkgClient: DKGClientV8;
  private polkadotApi: ReturnType<typeof getPolkadotApi>;
  private impactMetrics: ReturnType<typeof getImpactMetrics>;

  constructor(dkgClient?: DKGClientV8, dkgConfig?: DKGConfig) {
    this.dkgClient = dkgClient || new DKGClientV8(dkgConfig);
    this.polkadotApi = getPolkadotApi();
    this.impactMetrics = getImpactMetrics();
  }

  /**
   * Publish a Community Note to the DKG
   */
  async publishNote(note: CommunityNote, epochs: number = 2): Promise<CommunityNoteResult> {
    console.log(`📝 Publishing Community Note: ${note.noteType} for ${note.targetUAL}`);

    // Get author reputation if not provided
    if (!note.authorReputation) {
      try {
        const reputation = await this.polkadotApi.getReputation(note.author);
        note.authorReputation = reputation.overall;
      } catch (error) {
        console.warn(`⚠️  Could not fetch reputation for ${note.author}:`, error);
        note.authorReputation = 0;
      }
    }

    // Convert to JSON-LD Knowledge Asset
    const knowledgeAsset = this.noteToJSONLD(note);

    try {
      // Publish to DKG
      const result = await this.dkgClient.publishReputationAsset(
        {
          developerId: note.author,
          reputationScore: note.authorReputation || 0,
          contributions: [],
          timestamp: note.timestamp,
          metadata: knowledgeAsset as any,
        },
        epochs
      );

      // Update note with UAL
      const publishedNote: CommunityNote = {
        ...note,
        ual: result.UAL,
        id: result.UAL,
      };

      // Record metrics
      this.impactMetrics.recordCommunityNote(
        note.noteType,
        note.authorReputation || 0,
        note.evidence.length > 0
      );

      console.log(`✅ Community Note published: ${result.UAL}`);

      return {
        note: publishedNote,
        ual: result.UAL,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        published: true,
      };
    } catch (error: any) {
      console.error(`❌ Failed to publish Community Note:`, error);
      throw new Error(`Failed to publish Community Note: ${error.message}`);
    }
  }

  /**
   * Query Community Notes for a target UAL
   */
  async getNotesForTarget(targetUAL: string): Promise<CommunityNote[]> {
    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?note ?type ?content ?author ?reputation ?evidence ?reasoning ?timestamp
      WHERE {
        ?note a dotrep:CommunityNote .
        ?note dotrep:targetUAL "${targetUAL}" .
        ?note dotrep:noteType ?type .
        ?note schema:text ?content .
        ?note schema:author ?author .
        OPTIONAL { ?author dotrep:reputationScore ?reputation . }
        OPTIONAL { ?note dotrep:evidence ?evidence . }
        OPTIONAL { ?note dotrep:reasoning ?reasoning . }
        OPTIONAL { ?note schema:datePublished ?timestamp . }
      }
      ORDER BY DESC(?reputation) DESC(?timestamp)
    `;

    try {
      const results = await this.dkgClient['dkg']?.graph?.query?.(query, 'SELECT') || [];
      
      return results.map((result: any) => ({
        id: result.note,
        targetUAL,
        noteType: this.parseNoteType(result.type),
        content: result.content || '',
        author: result.author || '',
        authorReputation: result.reputation ? parseInt(result.reputation) : undefined,
        evidence: result.evidence ? (Array.isArray(result.evidence) ? result.evidence : [result.evidence]) : [],
        reasoning: result.reasoning || '',
        timestamp: result.timestamp ? parseInt(result.timestamp) : Date.now(),
        ual: result.note,
      }));
    } catch (error: any) {
      console.error(`❌ Failed to query Community Notes:`, error);
      return [];
    }
  }

  /**
   * Create a Community Note from an AI agent correction
   */
  async createAgentNote(
    targetUAL: string,
    claim: string,
    correction: string,
    evidence: string[],
    agentId: string = 'agent:dotrep-v1'
  ): Promise<CommunityNoteResult> {
    const note: CommunityNote = {
      targetUAL,
      noteType: 'correction',
      content: `Agent Correction: "${claim}" → "${correction}"`,
      author: agentId,
      evidence,
      reasoning: `Automated correction by AI agent ${agentId} based on DKG verification.`,
      timestamp: Date.now(),
    };

    return this.publishNote(note);
  }

  /**
   * Convert Community Note to JSON-LD format
   */
  private noteToJSONLD(note: CommunityNote): any {
    return {
      '@context': [
        'https://schema.org/',
        {
          dotrep: 'https://dotrep.io/ontology/',
          prov: 'http://www.w3.org/ns/prov#',
        },
      ],
      '@type': 'dotrep:CommunityNote',
      '@id': note.ual || `urn:ual:dotrep:community-note:${Date.now()}`,
      'schema:name': `Community Note: ${note.noteType}`,
      'schema:text': note.content,
      'schema:author': {
        '@type': 'schema:Person',
        'schema:identifier': note.author,
        'dotrep:reputationScore': note.authorReputation || 0,
      },
      'schema:datePublished': new Date(note.timestamp).toISOString(),
      'dotrep:targetUAL': note.targetUAL,
      'dotrep:noteType': note.noteType,
      'dotrep:reasoning': note.reasoning,
      'dotrep:evidence': note.evidence.map((ev) => ({
        '@type': 'schema:CreativeWork',
        'schema:url': ev,
      })),
      'prov:wasGeneratedBy': {
        '@type': 'prov:Activity',
        'prov:wasAssociatedWith': note.author,
      },
    };
  }

  /**
   * Parse note type from string
   */
  private parseNoteType(type: string): 'misinformation' | 'correction' | 'verification' | 'other' {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('misinformation')) return 'misinformation';
    if (typeLower.includes('correction')) return 'correction';
    if (typeLower.includes('verification')) return 'verification';
    return 'other';
  }

  /**
   * Get note statistics
   */
  async getNoteStatistics(): Promise<{
    totalNotes: number;
    notesByType: Record<string, number>;
    averageAuthorReputation: number;
    notesWithEvidence: number;
  }> {
    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT (COUNT(?note) AS ?total)
             (COUNT(DISTINCT ?type) AS ?types)
      WHERE {
        ?note a dotrep:CommunityNote .
        OPTIONAL { ?note dotrep:noteType ?type . }
      }
    `;

    try {
      const results = await this.dkgClient['dkg']?.graph?.query?.(query, 'SELECT') || [];
      // In production, would parse results and calculate statistics
      
      // For now, return metrics from ImpactMetricsService
      const metrics = this.impactMetrics.getMetrics();
      const notes = metrics.communityNotes;
      
      return {
        totalNotes: notes.notesPublished,
        notesByType: {
          misinformation: notes.notesByType.misinformation,
          correction: notes.notesByType.correction,
          verification: notes.notesByType.verification,
          other: notes.notesByType.other,
        },
        averageAuthorReputation: notes.averageReputationOfAuthors,
        notesWithEvidence: notes.notesWithEvidence,
      };
    } catch (error) {
      console.error(`❌ Failed to get note statistics:`, error);
      return {
        totalNotes: 0,
        notesByType: {},
        averageAuthorReputation: 0,
        notesWithEvidence: 0,
      };
    }
  }
}

// Singleton instance
let communityNotesInstance: CommunityNotesService | null = null;

export function getCommunityNotesService(
  dkgClient?: DKGClientV8,
  dkgConfig?: DKGConfig
): CommunityNotesService {
  if (!communityNotesInstance) {
    communityNotesInstance = new CommunityNotesService(dkgClient, dkgConfig);
  }
  return communityNotesInstance;
}

