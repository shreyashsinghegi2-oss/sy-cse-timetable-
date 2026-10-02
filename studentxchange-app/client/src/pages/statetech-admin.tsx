import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { getFirestore, collection, getDocs, doc, updateDoc, Timestamp, query, orderBy } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import { 
  ArrowLeft, CheckCircle, XCircle, Clock, Download, 
  FileText, Users, Eye, Filter, Search, Loader2,
  Building, GraduationCap, AlertCircle, ExternalLink,
  RefreshCw, Shield
} from "lucide-react";

import { STATETECH_ADMIN_EMAILS } from "@/config/constants";
const ADMIN_EMAILS = STATETECH_ADMIN_EMAILS;
const db = getFirestore(app);

interface Registration {
  id: string;
  uid: string;
  collegeName: string;
  branch: string;
  degree: string;
  category: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  teamMembers: { name: string; phone: string }[];
  proposalUrl: string;
  proposalFileName: string;
  paymentRequired: boolean;
  paymentStatus: 'pending' | 'paid' | 'exempt';
  paymentScreenshotUrl?: string;
  transactionId?: string;
  verificationStatus: 'submitted' | 'under_verification' | 'verified' | 'rejected';
  adminRemarks?: string;
  createdAt: any;
}

const CATEGORY_LABELS: Record<string, string> = {
  innovators: "Innovators' Arena",
  blueprint: "Blueprint Bonanza",
  concept: "Concept Catalyst",
  ideathon: "Ideathon Challenge"
};

const DEGREE_LABELS: Record<string, string> = {
  diploma: "Diploma",
  btech: "B.Tech",
  mtech: "M.Tech",
  "12th": "12th Science"
};

export default function StatetechAdmin() {
  const [, setLocation] = useLocation();
  const { user, status } = useCollabAuth();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [degreeFilter, setDegreeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const isAdmin = ADMIN_EMAILS.includes(user?.email?.toLowerCase() || '');

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      toast({ title: "Access denied", description: "Admin access only", variant: "destructive" });
      setLocation('/statetech-2026');
    }
  }, [status, isAdmin, setLocation, toast]);

  const fetchRegistrations = async () => {
    setIsLoading(true);
    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      const token = await currentUser.getIdToken(true);
      
      const response = await fetch('/api/collab/social/statetech/admin/registrations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }
      
      const regs: Registration[] = await response.json();
      regs.sort((a, b) => {
        const aLinked = (a as any).profileLinked ? 1 : 0;
        const bLinked = (b as any).profileLinked ? 1 : 0;
        if (bLinked !== aLinked) return bLinked - aLinked;
        return 0;
      });
      setRegistrations(regs);
    } catch (err) {
      console.error("Error fetching registrations:", err);
      toast({ title: "Error", description: "Failed to load registrations", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchRegistrations();
    }
  }, [isAdmin]);

  const handleUpdateStatus = async (regId: string, newStatus: string, remarks?: string) => {
    setIsUpdating(true);
    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      const token = await currentUser.getIdToken(true);
      
      const response = await fetch(`/api/collab/social/statetech/admin/registrations/${regId}/verify`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, remarks: remarks || '' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      toast({ title: "Status updated", description: `Registration marked as ${newStatus}` });
      fetchRegistrations();
      setShowDetailsModal(false);
    } catch (err) {
      console.error("Update error:", err);
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredRegistrations = registrations.filter(reg => {
    if (categoryFilter !== "all" && reg.category !== categoryFilter) return false;
    if (degreeFilter !== "all" && reg.degree !== degreeFilter) return false;
    if (statusFilter !== "all" && reg.verificationStatus !== statusFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        reg.leadName.toLowerCase().includes(search) ||
        reg.collegeName.toLowerCase().includes(search) ||
        reg.leadEmail.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const stats = {
    total: registrations.length,
    verified: registrations.filter(r => r.verificationStatus === 'verified').length,
    pending: registrations.filter(r => ['submitted', 'under_verification'].includes(r.verificationStatus)).length,
    rejected: registrations.filter(r => r.verificationStatus === 'rejected').length,
    paid: registrations.filter(r => r.paymentStatus === 'paid').length,
    exempt: registrations.filter(r => r.paymentStatus === 'exempt').length
  };

  const exportCSV = () => {
    const verifiedRegs = registrations.filter(r => r.verificationStatus === 'verified');
    const headers = ['Team ID', 'Lead Name', 'Email', 'Phone', 'College', 'Branch', 'Degree', 'Category', 'Team Members', 'Payment Status'];
    const rows = verifiedRegs.map(r => [
      r.id,
      r.leadName,
      r.leadEmail,
      r.leadPhone,
      r.collegeName,
      r.branch,
      DEGREE_LABELS[r.degree] || r.degree,
      CATEGORY_LABELS[r.category] || r.category,
      r.teamMembers.map(m => m.name).join('; '),
      r.paymentStatus
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statetech_verified_participants_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Card className="max-w-md bg-white/10 border-0">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-blue-200">This page is restricted to administrators only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation('/statetech-2026')} className="text-blue-300 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">STATETECH Admin Dashboard</h1>
              <p className="text-blue-300 text-sm">Manage registrations and verifications</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchRegistrations} className="border-white/20 text-blue-300">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportCSV} className="bg-green-600 hover:bg-green-700">
              <Download className="h-4 w-4 mr-2" />
              Export Verified (CSV)
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card className="border-0 bg-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-white">{stats.total}</p>
              <p className="text-blue-300 text-sm">Total</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-green-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{stats.verified}</p>
              <p className="text-green-300 text-sm">Verified</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-yellow-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
              <p className="text-yellow-300 text-sm">Pending</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-red-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
              <p className="text-red-300 text-sm">Rejected</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-blue-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-400">{stats.paid}</p>
              <p className="text-blue-300 text-sm">Paid</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-purple-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-400">{stats.exempt}</p>
              <p className="text-purple-300 text-sm">Free (12th)</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 bg-white/10 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-400" />
                <span className="text-blue-300 text-sm">Filters:</span>
              </div>
              
              <div className="relative flex-1 max-w-xs">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
                <Input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, college, email..."
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-300/50"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="innovators">Innovators' Arena</SelectItem>
                  <SelectItem value="blueprint">Blueprint Bonanza</SelectItem>
                  <SelectItem value="concept">Concept Catalyst</SelectItem>
                  <SelectItem value="ideathon">Ideathon</SelectItem>
                </SelectContent>
              </Select>

              <Select value={degreeFilter} onValueChange={setDegreeFilter}>
                <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Degree" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Degrees</SelectItem>
                  <SelectItem value="diploma">Diploma</SelectItem>
                  <SelectItem value="btech">B.Tech</SelectItem>
                  <SelectItem value="mtech">M.Tech</SelectItem>
                  <SelectItem value="12th">12th Science</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_verification">Under Verification</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/10">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-blue-400/50 mx-auto mb-4" />
                <p className="text-blue-200">No registrations found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-blue-300 text-sm font-medium">Lead Name</th>
                      <th className="text-left p-4 text-blue-300 text-sm font-medium hidden md:table-cell">College</th>
                      <th className="text-left p-4 text-blue-300 text-sm font-medium hidden lg:table-cell">Degree</th>
                      <th className="text-left p-4 text-blue-300 text-sm font-medium">Category</th>
                      <th className="text-left p-4 text-blue-300 text-sm font-medium">Payment</th>
                      <th className="text-left p-4 text-blue-300 text-sm font-medium">Status</th>
                      <th className="text-left p-4 text-blue-300 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{reg.leadName}</p>
                            {(reg as any).profileLinked && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                ★ Priority
                              </span>
                            )}
                          </div>
                          <p className="text-blue-300 text-xs md:hidden">{reg.collegeName}</p>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <p className="text-white text-sm">{reg.collegeName}</p>
                          <p className="text-blue-300 text-xs">{reg.branch}</p>
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <Badge variant="outline" className="border-blue-400/30 text-blue-300">
                            {DEGREE_LABELS[reg.degree] || reg.degree}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                            {CATEGORY_LABELS[reg.category]?.split(' ')[0] || reg.category}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={
                            reg.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-300' :
                            reg.paymentStatus === 'exempt' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-yellow-500/20 text-yellow-300'
                          }>
                            {reg.paymentStatus === 'exempt' ? 'Free' : reg.paymentStatus}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={
                            reg.verificationStatus === 'verified' ? 'bg-green-500 text-white' :
                            reg.verificationStatus === 'rejected' ? 'bg-red-500 text-white' :
                            reg.verificationStatus === 'under_verification' ? 'bg-yellow-500 text-white' :
                            'bg-gray-500 text-white'
                          }>
                            {reg.verificationStatus === 'under_verification' ? 'Reviewing' : reg.verificationStatus}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => { setSelectedReg(reg); setShowDetailsModal(true); }}
                            className="border-white/20 text-blue-300 hover:bg-white/10"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl bg-slate-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Registration Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedReg && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-300 text-sm">Lead Name</p>
                    <p className="text-white font-medium">{selectedReg.leadName}</p>
                  </div>
                  <div>
                    <p className="text-blue-300 text-sm">Email</p>
                    <p className="text-white">{selectedReg.leadEmail}</p>
                  </div>
                  <div>
                    <p className="text-blue-300 text-sm">Phone</p>
                    <p className="text-white">{selectedReg.leadPhone}</p>
                  </div>
                  <div>
                    <p className="text-blue-300 text-sm">College</p>
                    <p className="text-white">{selectedReg.collegeName}</p>
                  </div>
                  <div>
                    <p className="text-blue-300 text-sm">Branch</p>
                    <p className="text-white">{selectedReg.branch}</p>
                  </div>
                  <div>
                    <p className="text-blue-300 text-sm">Degree</p>
                    <p className="text-white">{DEGREE_LABELS[selectedReg.degree]}</p>
                  </div>
                  <div>
                    <p className="text-blue-300 text-sm">Category</p>
                    <p className="text-white">{CATEGORY_LABELS[selectedReg.category]}</p>
                  </div>
                  <div>
                    <p className="text-blue-300 text-sm">Payment</p>
                    <Badge className={
                      selectedReg.paymentStatus === 'paid' ? 'bg-green-500' :
                      selectedReg.paymentStatus === 'exempt' ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }>
                      {selectedReg.paymentStatus}
                    </Badge>
                  </div>
                </div>

                {selectedReg.teamMembers.length > 0 && (
                  <div>
                    <p className="text-blue-300 text-sm mb-2">Team Members</p>
                    <div className="space-y-2">
                      {selectedReg.teamMembers.map((m, i) => (
                        <div key={i} className="flex items-center gap-4 bg-white/5 rounded-lg p-3">
                          <span className="text-white">{m.name}</span>
                          <span className="text-blue-300 text-sm">{m.phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-300 text-sm mb-2">Project Proposal</p>
                    <a 
                      href={selectedReg.proposalUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30"
                    >
                      <FileText className="h-4 w-4" />
                      View PDF
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  
                  {selectedReg.paymentScreenshotUrl && (
                    <div>
                      <p className="text-blue-300 text-sm mb-2">Payment Screenshot</p>
                      <a 
                        href={selectedReg.paymentScreenshotUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30"
                      >
                        <Eye className="h-4 w-4" />
                        View Screenshot
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {selectedReg.transactionId && (
                        <p className="text-blue-300 text-xs mt-2">
                          Transaction ID: {selectedReg.transactionId}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-6">
                  <p className="text-blue-300 text-sm mb-4">Update Verification Status</p>
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      onClick={() => handleUpdateStatus(selectedReg.id, 'verified')}
                      disabled={isUpdating}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify Participant
                    </Button>
                    <Button 
                      onClick={() => handleUpdateStatus(selectedReg.id, 'under_verification')}
                      disabled={isUpdating}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Under Review
                    </Button>
                    <Button 
                      onClick={() => handleUpdateStatus(selectedReg.id, 'rejected')}
                      disabled={isUpdating}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
