import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare,
  Loader2,
  Send,
  Search,
  FileText,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CommunityNotesPage() {
  const [targetUAL, setTargetUAL] = useState("");
  const [noteType, setNoteType] = useState<"misinformation" | "correction" | "verification" | "other">("correction");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [queryUAL, setQueryUAL] = useState("");

  const publishMutation = trpc.communityNotes.publish.useMutation({
    onSuccess: () => {
      toast.success("Community Note published successfully!");
      setTargetUAL("");
      setContent("");
      setAuthor("");
      setEvidence("");
      setReasoning("");
    },
    onError: (error) => {
      toast.error(`Publish failed: ${error.message}`);
    },
  });

  const { data: notes, isLoading: notesLoading } = trpc.communityNotes.getForTarget.useQuery(
    { targetUAL: queryUAL },
    { enabled: !!queryUAL }
  );

  const { data: statistics } = trpc.communityNotes.getStatistics.useQuery();

  const handlePublish = () => {
    if (!targetUAL || !content || !author) {
      toast.error("Please fill in all required fields");
      return;
    }

    let evidenceArray: string[] = [];
    if (evidence) {
      try {
        evidenceArray = evidence.split("\n").filter(e => e.trim());
      } catch {
        toast.error("Invalid evidence format");
        return;
      }
    }

    publishMutation.mutate({
      targetUAL,
      noteType,
      content,
      author,
      evidence: evidenceArray,
      reasoning: reasoning || undefined,
    });
  };

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-purple-600" />
              Community Notes
            </h1>
            <p className="text-muted-foreground mt-2">
              Publish and view community notes for reputation assets and contributions
            </p>
          </div>

          <Tabs defaultValue="publish" className="space-y-6">
            <TabsList>
              <TabsTrigger value="publish">Publish Note</TabsTrigger>
              <TabsTrigger value="query">Query Notes</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="publish">
              <Card>
                <CardHeader>
                  <CardTitle>Publish Community Note</CardTitle>
                  <CardDescription>
                    Create a note to correct, verify, or comment on a reputation asset
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="targetUAL">Target UAL</Label>
                    <Input
                      id="targetUAL"
                      value={targetUAL}
                      onChange={(e) => setTargetUAL(e.target.value)}
                      placeholder="ual:reputation:..."
                      className="mt-1 font-mono"
                    />
                  </div>

                  <div>
                    <Label htmlFor="noteType">Note Type</Label>
                    <Select value={noteType} onValueChange={(value: any) => setNoteType(value)}>
                      <SelectTrigger id="noteType" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="misinformation">Misinformation</SelectItem>
                        <SelectItem value="correction">Correction</SelectItem>
                        <SelectItem value="verification">Verification</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter note content..."
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="author">Author</Label>
                    <Input
                      id="author"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Your DID or username"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="evidence">Evidence (one per line, optional)</Label>
                    <Textarea
                      id="evidence"
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      placeholder="Evidence URL 1&#10;Evidence URL 2"
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="reasoning">Reasoning (optional)</Label>
                    <Textarea
                      id="reasoning"
                      value={reasoning}
                      onChange={(e) => setReasoning(e.target.value)}
                      placeholder="Explain your reasoning..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handlePublish}
                    disabled={publishMutation.isPending || !targetUAL || !content || !author}
                    className="w-full"
                  >
                    {publishMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Publish Note
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="query">
              <Card>
                <CardHeader>
                  <CardTitle>Query Community Notes</CardTitle>
                  <CardDescription>
                    View all notes for a specific reputation asset
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="queryUAL">Target UAL</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="queryUAL"
                        value={queryUAL}
                        onChange={(e) => setQueryUAL(e.target.value)}
                        placeholder="ual:reputation:..."
                        className="font-mono"
                      />
                      <Button onClick={() => {}}>
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {notesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                  ) : notes && notes.length > 0 ? (
                    <div className="space-y-4">
                      {notes.map((note: any, index: number) => (
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">{note.noteType}</CardTitle>
                              <Badge variant="outline">{note.author}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm mb-2">{note.content}</p>
                            {note.evidence && note.evidence.length > 0 && (
                              <div className="mt-2">
                                <Label className="text-xs">Evidence:</Label>
                                <ul className="list-disc list-inside text-xs text-muted-foreground">
                                  {note.evidence.map((e: string, i: number) => (
                                    <li key={i}>{e}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {note.reasoning && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Reasoning: {note.reasoning}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : queryUAL ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No notes found for this UAL
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      Enter a UAL to query notes
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics">
              {statistics ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Total Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{statistics.totalNotes || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">By Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(statistics.byType || {}).map(([type, count]: [string, any]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm">{type}</span>
                            <Badge>{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {statistics.recentActivity || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No statistics available
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UnifiedSidebar>
  );
}

