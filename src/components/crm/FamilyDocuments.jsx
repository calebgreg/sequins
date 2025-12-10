import React, { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { FileText, Upload, Download, Trash2, File, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function FamilyDocuments({ familyEmail }) {
    const fileInputRef = useRef(null);
    const queryClient = useQueryClient();

    const { data: documents = [] } = useQuery({
        queryKey: ['family_documents', familyEmail],
        queryFn: async () => {
            const all = await base44.entities.FamilyDocument.list();
            return all.filter(d => d.parent_email === familyEmail).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
    });

    const uploadMutation = useMutation({
        mutationFn: async (file) => {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            return base44.entities.FamilyDocument.create({
                parent_email: familyEmail,
                name: file.name,
                url: file_url,
                type: 'other',
                uploaded_by: 'Staff'
            });
        },
        onSuccess: () => {
            toast.success("Document uploaded successfully");
            queryClient.invalidateQueries(['family_documents']);
        },
        onError: () => toast.error("Failed to upload document")
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.FamilyDocument.delete(id),
        onSuccess: () => {
            toast.success("Document removed");
            queryClient.invalidateQueries(['family_documents']);
        }
    });

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadMutation.mutate(file);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-serif text-[#333333]">Documents</h3>
                    <p className="text-sm text-gray-400">Contracts, waivers, and files for this family</p>
                </div>
                <div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileSelect}
                    />
                    <Button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={uploadMutation.isPending}
                        className="bg-[#333333] text-white hover:bg-black gap-2"
                    >
                        {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload File
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map(doc => (
                    <Card key={doc.id} className="p-4 flex items-start justify-between group hover:shadow-md transition-all">
                        <div className="flex items-start gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-medium text-[#333333] truncate pr-2" title={doc.name}>
                                    {doc.name}
                                </div>
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                    {format(new Date(doc.created_date), 'MMM d, yyyy')}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => window.open(doc.url, '_blank')}
                                className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                            >
                                <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => deleteMutation.mutate(doc.id)}
                                className="h-8 w-8 text-gray-400 hover:text-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                ))}

                {/* Upload Placeholder */}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-100 rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-200 hover:bg-indigo-50/30 hover:text-indigo-600 transition-all min-h-[100px]"
                >
                    <Upload className="w-6 h-6 mb-2 opacity-50" />
                    <span className="text-sm font-medium">Upload New</span>
                </button>
            </div>
        </div>
    );
}