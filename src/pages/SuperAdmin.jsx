import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Check, Users, ArrowRight, Shield, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

export default function SuperAdmin() {
  const [newStudioName, setNewStudioName] = useState('');
  const [newStudioEmail, setNewStudioEmail] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteStudio, setDeleteStudio] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Get current user
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch all studios
  const { data: studios = [], isLoading: studiosLoading } = useQuery({
    queryKey: ['allStudios'],
    queryFn: () => base44.entities.Studio.list(),
    enabled: currentUser?.role === 'admin',
  });

  // Fetch all users to show counts
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin',
  });

  // Create studio mutation
  const createStudioMutation = useMutation({
    mutationFn: async (studioData) => {
      return await base44.entities.Studio.create(studioData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allStudios'] });
      setNewStudioName('');
      setNewStudioEmail('');
      setIsCreateOpen(false);
      toast.success('Studio created successfully');
    },
    onError: (err) => {
      toast.error('Failed to create studio: ' + err.message);
    }
  });

  // Switch studio mutation (update current user's studio_id)
  const switchStudioMutation = useMutation({
    mutationFn: async (studioId) => {
      await base44.auth.updateMe({ studio_id: studioId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Switched studio context');
      // Reload to refresh all data
      window.location.reload();
    },
    onError: (err) => {
      toast.error('Failed to switch studio: ' + err.message);
    }
  });

  // Delete studio handler
  const handleDeleteStudio = async () => {
    if (!deleteStudio || deleteConfirmName !== deleteStudio.name) {
      toast.error('Please type the studio name to confirm deletion');
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await base44.functions.invoke('deleteStudio', { studio_id: deleteStudio.id });
      
      // If current studio was deleted, clear it from user
      if (currentUser?.studio_id === deleteStudio.id) {
        await base44.auth.updateMe({ studio_id: null });
      }
      
      queryClient.invalidateQueries({ queryKey: ['allStudios'] });
      toast.success('Studio and all data deleted successfully');
      setDeleteStudio(null);
      setDeleteConfirmName('');
      
      if (currentUser?.studio_id === deleteStudio.id) {
        window.location.reload();
      }
    } catch (err) {
      toast.error('Failed to delete studio: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateStudio = () => {
    if (!newStudioName.trim()) {
      toast.error('Please enter a studio name');
      return;
    }
    createStudioMutation.mutate({
      name: newStudioName.trim(),
      owner_email: newStudioEmail.trim() || currentUser?.email,
      status: 'active',
    });
  };

  const getUserCountForStudio = (studioId) => {
    return allUsers.filter(u => u.studio_id === studioId).length;
  };

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Access control - only admins can see this page
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#faf9f7]">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-900">Super Admin</h1>
            </div>
            <p className="text-gray-500">Manage all studios and tenants in Sequins</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                New Studio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Studio</DialogTitle>
                <DialogDescription>
                  Add a new dance studio tenant to Sequins.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="studioName">Studio Name</Label>
                  <Input
                    id="studioName"
                    placeholder="e.g., Sunshine Dance Academy"
                    value={newStudioName}
                    onChange={(e) => setNewStudioName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerEmail">Owner Email (optional)</Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    placeholder="owner@example.com"
                    value={newStudioEmail}
                    onChange={(e) => setNewStudioEmail(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Leave blank to use your email</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateStudio}
                  disabled={createStudioMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {createStudioMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Create Studio
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Current Context */}
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-indigo-900">Current Studio Context</CardTitle>
          </CardHeader>
          <CardContent>
            {currentUser?.studio_id ? (
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-indigo-900">
                  {studios.find(s => s.id === currentUser.studio_id)?.name || 'Unknown Studio'}
                </span>
                <Badge variant="outline" className="text-indigo-600 border-indigo-300">Active</Badge>
              </div>
            ) : (
              <p className="text-gray-500">No studio selected. Choose one below to get started.</p>
            )}
          </CardContent>
        </Card>

        {/* Studios List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">All Studios ({studios.length})</h2>
          
          {studiosLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            </div>
          ) : studios.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">No studios yet. Create your first one!</p>
                <Button onClick={() => setIsCreateOpen(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Studio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {studios.map((studio) => {
                const isCurrentStudio = currentUser?.studio_id === studio.id;
                const userCount = getUserCountForStudio(studio.id);
                
                return (
                  <Card 
                    key={studio.id} 
                    className={`transition-all ${isCurrentStudio ? 'border-indigo-300 bg-indigo-50/30' : 'hover:border-gray-300'}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isCurrentStudio ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                            <Building2 className={`w-6 h-6 ${isCurrentStudio ? 'text-indigo-600' : 'text-gray-500'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{studio.name}</h3>
                              {isCurrentStudio && (
                                <Badge className="bg-indigo-600">Current</Badge>
                              )}
                              <Badge variant="outline" className={
                                studio.status === 'active' ? 'text-green-600 border-green-300' :
                                studio.status === 'trial' ? 'text-amber-600 border-amber-300' :
                                'text-gray-500 border-gray-300'
                              }>
                                {studio.status || 'active'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                              <span>{studio.owner_email}</span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {userCount} users
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {!isCurrentStudio && (
                          <Button
                            variant="outline"
                            onClick={() => switchStudioMutation.mutate(studio.id)}
                            disabled={switchStudioMutation.isPending}
                          >
                            {switchStudioMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                Switch <ArrowRight className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </Button>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {isCurrentStudio && (
                            <div className="flex items-center gap-2 text-indigo-600 mr-2">
                              <Check className="w-5 h-5" />
                              <span className="text-sm font-medium">Active</span>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteStudio(studio)}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteStudio} onOpenChange={(open) => { if (!open) { setDeleteStudio(null); setDeleteConfirmName(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Studio
            </DialogTitle>
            <DialogDescription>
              This action is <strong>irreversible</strong>. All data associated with this studio will be permanently deleted, including:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc list-inside">
              <li>All teachers and staff</li>
              <li>All students and families</li>
              <li>All classes and attendance records</li>
              <li>All invoices and billing data</li>
              <li>All performances and routines</li>
              <li>All messages and notes</li>
            </ul>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-800">
                To confirm, type <strong>{deleteStudio?.name}</strong> below:
              </p>
            </div>
            <Input
              placeholder="Type studio name to confirm"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              className="border-red-200 focus:border-red-400"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteStudio(null); setDeleteConfirmName(''); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteStudio}
              disabled={isDeleting || deleteConfirmName !== deleteStudio?.name}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Studio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}