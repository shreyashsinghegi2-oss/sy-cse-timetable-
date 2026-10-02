import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { collabFetch } from "@/lib/firebase";
import { ArrowLeft, Trophy, Loader2, Plus, X, Link as LinkIcon, Upload, Code, Cpu, Palette, Sparkles } from "lucide-react";

const arenaSubmitSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  category: z.enum(['software', 'hardware', 'art'], { required_error: "Please select a category" }),
  problemStatement: z.string().min(20, "Problem statement must be at least 20 characters").max(500, "Problem statement must be less than 500 characters"),
  solution: z.string().min(30, "Solution must be at least 30 characters").max(1000, "Solution must be less than 1000 characters"),
  toolsUsed: z.string().min(5, "Please list the tools you used").max(300, "Tools list must be less than 300 characters"),
  challengesFaced: z.string().min(20, "Please describe the challenges").max(500, "Challenges must be less than 500 characters"),
  learnings: z.string().min(20, "Please share what you learned").max(500, "Learnings must be less than 500 characters"),
  description: z.string().min(10, "Add a brief description").max(300, "Description must be less than 300 characters"),
});

type ArenaSubmitForm = z.infer<typeof arenaSubmitSchema>;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CollabArenaSubmit() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useCollabAuth();
  const { toast } = useToast();
  const [proofLinks, setProofLinks] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentMonth = (() => {
    const now = new Date();
    return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  })();

  const form = useForm<ArenaSubmitForm>({
    resolver: zodResolver(arenaSubmitSchema),
    defaultValues: {
      title: '',
      problemStatement: '',
      solution: '',
      toolsUsed: '',
      challengesFaced: '',
      learnings: '',
      description: '',
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: ArenaSubmitForm) => {
      const validLinks = proofLinks.filter(link => link.trim().length > 0);

      const requestBody = JSON.stringify({
        type: 'arena',
        title: data.title,
        description: data.description,
        category: data.category,
        problemStatement: data.problemStatement,
        solution: data.solution,
        toolsUsed: data.toolsUsed,
        challengesFaced: data.challengesFaced,
        learnings: data.learnings,
        proofOfWork: validLinks,
      });

      // Retry logic for network failures
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

          const response = await collabFetch('/api/collab/social/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: requestBody,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit project');
          }

          return response.json();
        } catch (error: any) {
          lastError = error;
          
          // Don't retry on auth errors or validation errors
          if (error.message?.includes('already submitted') || 
              error.message?.includes('Not authenticated') ||
              error.message?.includes('not registered')) {
            throw error;
          }

          // Network error - retry after delay
          if (attempt < maxRetries && (error.name === 'AbortError' || error.message === 'Failed to fetch')) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            continue;
          }
          
          throw error;
        }
      }

      throw lastError || new Error('Failed to submit after multiple attempts');
    },
    onSuccess: () => {
      toast({
        title: "Project Submitted!",
        description: "Your project has been submitted to Collab Arena",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/arena/posts'] });
      setLocation('/collab-arena');
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addProofLink = () => {
    if (proofLinks.length < 5) {
      setProofLinks([...proofLinks, '']);
    }
  };

  const removeProofLink = (index: number) => {
    setProofLinks(proofLinks.filter((_, i) => i !== index));
  };

  const updateProofLink = (index: number, value: string) => {
    const newLinks = [...proofLinks];
    newLinks[index] = value;
    setProofLinks(newLinks);
  };

  const onSubmit = (data: ArenaSubmitForm) => {
    submitMutation.mutate(data);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-8 text-center">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Collab Arena</h2>
            <p className="text-gray-300 mb-6">Sign in to submit your project</p>
            <Button onClick={() => setLocation('/student-collab')} className="w-full">
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/collab-arena')}
            data-testid="button-back-arena"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Submit Your Project</h1>
            <p className="text-sm text-gray-500">{currentMonth} Edition</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-blue-600 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-6 h-6" />
            <h2 className="text-xl font-bold">Showcase Your Work</h2>
          </div>
          <p className="text-blue-100 text-sm">
            Submit your project to compete in this month's Collab Arena. Make sure to provide detailed information
            about your work. Projects will be reviewed and verified by our team.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-blue-600" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Title *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your project title" 
                          {...field} 
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="software">
                            <div className="flex items-center gap-2">
                              <Code className="w-4 h-4 text-blue-600" />
                              Software
                            </div>
                          </SelectItem>
                          <SelectItem value="hardware">
                            <div className="flex items-center gap-2">
                              <Cpu className="w-4 h-4 text-green-600" />
                              Hardware
                            </div>
                          </SelectItem>
                          <SelectItem value="art">
                            <div className="flex items-center gap-2">
                              <Palette className="w-4 h-4 text-blue-600" />
                              Art
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brief Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="A short summary of your project (shown in cards)" 
                          rows={2}
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Problem & Solution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="problemStatement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Problem Statement *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What problem does your project solve?" 
                          rows={3}
                          {...field}
                          data-testid="input-problem"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="solution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Solution Explanation *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="How does your project solve the problem?" 
                          rows={4}
                          {...field}
                          data-testid="input-solution"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toolsUsed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tools & Technologies Used *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="List the technologies, frameworks, and tools you used" 
                          rows={2}
                          {...field}
                          data-testid="input-tools"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Challenges & Learnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="challengesFaced"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Challenges Faced *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What challenges did you encounter and how did you overcome them?" 
                          rows={3}
                          {...field}
                          data-testid="input-challenges"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="learnings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What You Learned *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What did you learn from this project?" 
                          rows={3}
                          {...field}
                          data-testid="input-learnings"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Proof of Work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  Add links to your demo, GitHub repository, live project, or any other proof of work.
                </p>
                
                {proofLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="https://github.com/your/project"
                      value={link}
                      onChange={(e) => updateProofLink(index, e.target.value)}
                      data-testid={`input-proof-${index}`}
                    />
                    {proofLinks.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeProofLink(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {proofLinks.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProofLink}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Link
                  </Button>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/collab-arena')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="button-submit"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 mr-2" />
                    Submit Project
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
