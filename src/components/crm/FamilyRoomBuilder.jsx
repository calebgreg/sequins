import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    Layout, Plus, GripVertical, Image as ImageIcon, Type, Video, 
    FileText, DollarSign, Star, Move, Trash2, Eye, Save, ExternalLink,
    Palette, ArrowRight, Check, MousePointerClick, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createPageUrl } from '../../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const MODULE_TYPES = [
    { type: 'hero', icon: ImageIcon, label: 'Hero Header', description: 'Big impact welcome banner' },
    { type: 'text_block', icon: Type, label: 'Text Content', description: 'Rich text and storytelling' },
    { type: 'video_embed', icon: Video, label: 'Video', description: 'YouTube/Vimeo embed' },
    { type: 'file_download', icon: FileText, label: 'Resource', description: 'PDFs or docs for download' },
    { type: 'invoice_highlight', icon: DollarSign, label: 'Billing Summary', description: 'Outstanding balance card' },
    { type: 'class_recommendation', icon: Star, label: 'Class Recs', description: 'Suggested classes' },
    { type: 'cta_button', icon: MousePointerClick, label: 'Action Button', description: 'Call to action' },
];

export default function FamilyRoomBuilder({ family, onClose }) {
    const queryClient = useQueryClient();
    const [activeConfig, setActiveConfig] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch existing config or init new
    const { data: existingConfig, isLoading } = useQuery({
        queryKey: ['familyRoom', family.email],
        queryFn: async () => {
            const all = await base44.entities.FamilyRoomConfig.list();
            return all.find(c => c.parent_email === family.email);
        }
    });

    // Initialize config only once when data is available
    useEffect(() => {
        if (!isLoading && !activeConfig) {
            if (existingConfig) {
                setActiveConfig(existingConfig);
            } else {
                // Default Template
                setActiveConfig({
                    parent_email: family.email,
                    page_title: `Welcome, ${family.parent_name.split(' ')[0]}!`,
                    status: 'draft',
                    theme: 'elegant',
                    modules: [
                        {
                            id: 'mod_1',
                            type: 'hero',
                            content: {
                                title: `The ${family.parent_name.split(' ').pop()} Family Portal`,
                                subtitle: "We're so excited to have you with us this season.",
                                image_url: "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?q=80&w=2535&auto=format&fit=crop"
                            },
                            isVisible: true
                        },
                        {
                            id: 'mod_2',
                            type: 'text_block',
                            content: {
                                heading: "A Note from Our Director",
                                body: "Welcome to the family! We've prepared this personalized space to keep everything organized for you. Below you'll find your current schedule, billing details, and some resources to get started."
                            },
                            isVisible: true
                        }
                    ]
                });
            }
        }
    }, [existingConfig, isLoading, family, activeConfig]);

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (data.id) {
                return base44.entities.FamilyRoomConfig.update(data.id, data);
            } else {
                return base44.entities.FamilyRoomConfig.create(data);
            }
        },
        onSuccess: (saved) => {
            queryClient.invalidateQueries(['familyRoom']);
            setActiveConfig(saved);
            toast.success("Room configuration saved successfully");
        },
        onError: (err) => {
            console.error("Failed to save room config:", err);
            toast.error("Failed to save changes. Please try again.");
        }
    });

    const handlePublish = () => {
        setIsSaving(true);
        const publishedConfig = { ...activeConfig, status: 'published' };
        setActiveConfig(publishedConfig); // Optimistic update
        saveMutation.mutate(publishedConfig, {
            onSettled: () => setIsSaving(false)
        });
    };

    const handlePreview = () => {
        setShowFullPreview(true);
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const newModules = Array.from(activeConfig.modules);
        const [reorderedItem] = newModules.splice(result.source.index, 1);
        newModules.splice(result.destination.index, 0, reorderedItem);
        setActiveConfig({ ...activeConfig, modules: newModules });
    };

    const addModule = (type) => {
        const newModule = {
            id: `mod_${Date.now()}`,
            type: type,
            content: getDefaultContent(type),
            isVisible: true
        };
        setActiveConfig({
            ...activeConfig,
            modules: [...activeConfig.modules, newModule]
        });
        toast.info(`Added ${MODULE_TYPES.find(t => t.type === type)?.label}`);
    };

    const removeModule = (id) => {
        setActiveConfig({
            ...activeConfig,
            modules: activeConfig.modules.filter(m => m.id !== id)
        });
    };

    const updateModuleContent = (id, field, value) => {
        const newModules = activeConfig.modules.map(m => {
            if (m.id === id) {
                return { ...m, content: { ...m.content, [field]: value } };
            }
            return m;
        });
        setActiveConfig({ ...activeConfig, modules: newModules });
    };

    const getDefaultContent = (type) => {
        switch(type) {
            case 'hero': return { title: 'Welcome', subtitle: 'Your personalized space', image_url: '' };
            case 'text_block': return { heading: 'New Section', body: 'Add your content here...' };
            case 'video_embed': return { url: '', caption: 'Watch this video' };
            case 'cta_button': return { label: 'Click Me', url: '#', style: 'primary' };
            case 'class_recommendation': return { title: 'Recommended for You', class_ids: [] };
            default: return {};
        }
    };

    if (!activeConfig) return <div className="p-8 text-center flex items-center justify-center gap-2 text-gray-400"><Loader2 className="animate-spin" /> Loading Room Builder...</div>;

    return (
        <div className="h-full flex flex-col bg-[#F4F4F6] overflow-hidden">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-[#333333] text-white p-2 rounded-lg">
                        <Layout className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-serif text-lg text-[#333333] leading-none">Digital Room Builder</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">Editing for {family.parent_name}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1">{activeConfig.status}</Badge>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handlePreview} className="gap-2 text-gray-500 hover:text-indigo-600">
                        <ExternalLink className="w-4 h-4" /> Live Preview
                    </Button>
                    <div className="h-6 w-px bg-gray-200" />
                    <Button 
                        onClick={handlePublish} 
                        disabled={isSaving || saveMutation.isPending}
                        className="bg-[#333333] text-white hover:bg-black gap-2"
                    >
                        {(isSaving || saveMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Publish Changes
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Module Library Sidebar */}
                <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Add Modules</h3>
                        <div className="space-y-2">
                            {MODULE_TYPES.map(mod => (
                                <button
                                    key={mod.type}
                                    onClick={() => addModule(mod.type)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:text-indigo-600 shadow-sm">
                                        <mod.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-[#333333]">{mod.label}</div>
                                        <div className="text-[10px] text-gray-400 leading-tight">{mod.description}</div>
                                    </div>
                                    <Plus className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 text-indigo-400" />
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="p-4 mt-auto bg-gray-50">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Room Settings</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Page Title</label>
                                <Input 
                                    value={activeConfig.page_title}
                                    onChange={(e) => setActiveConfig({...activeConfig, page_title: e.target.value})}
                                    className="h-8 text-sm bg-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Theme</label>
                                <div className="flex gap-2">
                                    {['elegant', 'energetic', 'minimal'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setActiveConfig({...activeConfig, theme: t})}
                                            className={`w-6 h-6 rounded-full border-2 ${activeConfig.theme === t ? 'border-[#333333]' : 'border-transparent'} flex items-center justify-center`}
                                        >
                                            <div className={`w-4 h-4 rounded-full ${
                                                t === 'elegant' ? 'bg-[#F2DCDD]' : 
                                                t === 'energetic' ? 'bg-indigo-500' : 'bg-white border border-gray-200'
                                            }`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Canvas / Editor Area */}
                <div className="flex-1 overflow-y-auto bg-[#F4F4F6] p-8">
                    <div className="max-w-3xl mx-auto space-y-6">
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="modules-list">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                                        {activeConfig.modules.map((module, index) => (
                                            <Draggable key={module.id} draggableId={module.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`bg-white rounded-2xl shadow-sm border ${snapshot.isDragging ? 'border-indigo-400 shadow-xl scale-105 z-50' : 'border-gray-100'} transition-all`}
                                                    >
                                                        {/* Module Header/Handle */}
                                                        <div className="flex items-center justify-between p-3 border-b border-gray-50 bg-gray-50/50 rounded-t-2xl">
                                                            <div className="flex items-center gap-3">
                                                                <div {...provided.dragHandleProps} className="cursor-grab hover:text-[#333333] text-gray-400">
                                                                    <GripVertical className="w-5 h-5" />
                                                                </div>
                                                                <Badge variant="secondary" className="bg-white text-xs font-normal">
                                                                    {MODULE_TYPES.find(t => t.type === module.type)?.label || module.type}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Switch 
                                                                    checked={module.isVisible} 
                                                                    onCheckedChange={(c) => {
                                                                        const newMods = [...activeConfig.modules];
                                                                        newMods[index].isVisible = c;
                                                                        setActiveConfig({...activeConfig, modules: newMods});
                                                                    }}
                                                                    className="scale-75"
                                                                />
                                                                <Button variant="ghost" size="icon" onClick={() => removeModule(module.id)} className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Module Editor Content */}
                                                        <div className="p-6">
                                                            {module.type === 'hero' && (
                                                                <div className="space-y-4">
                                                                    <Input 
                                                                        value={module.content.title}
                                                                        onChange={(e) => updateModuleContent(module.id, 'title', e.target.value)}
                                                                        className="font-serif text-2xl border-none p-0 focus-visible:ring-0 placeholder:text-gray-300"
                                                                        placeholder="Hero Title"
                                                                    />
                                                                    <Textarea 
                                                                        value={module.content.subtitle}
                                                                        onChange={(e) => updateModuleContent(module.id, 'subtitle', e.target.value)}
                                                                        className="resize-none border-none p-0 focus-visible:ring-0 text-gray-500"
                                                                        placeholder="Hero Subtitle"
                                                                    />
                                                                    <div className="flex items-center gap-2">
                                                                         <ImageIcon className="w-4 h-4 text-gray-400" />
                                                                         <Input 
                                                                            value={module.content.image_url}
                                                                            onChange={(e) => updateModuleContent(module.id, 'image_url', e.target.value)}
                                                                            className="h-8 text-xs bg-gray-50"
                                                                            placeholder="Background Image URL (Unsplash)"
                                                                         />
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {module.type === 'text_block' && (
                                                                <div className="space-y-4">
                                                                    <Input 
                                                                        value={module.content.heading}
                                                                        onChange={(e) => updateModuleContent(module.id, 'heading', e.target.value)}
                                                                        className="font-bold text-lg border-none p-0 focus-visible:ring-0"
                                                                        placeholder="Section Heading"
                                                                    />
                                                                    <Textarea 
                                                                        value={module.content.body}
                                                                        onChange={(e) => updateModuleContent(module.id, 'body', e.target.value)}
                                                                        className="min-h-[100px] border-gray-100 focus-visible:ring-1 focus-visible:ring-gray-200"
                                                                        placeholder="Write your content..."
                                                                    />
                                                                </div>
                                                            )}
                                                            
                                                            {module.type === 'video_embed' && (
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                                                        <Video className="w-4 h-4 text-gray-400" />
                                                                        <Input 
                                                                            value={module.content.url}
                                                                            onChange={(e) => updateModuleContent(module.id, 'url', e.target.value)}
                                                                            className="h-8 border-none bg-transparent"
                                                                            placeholder="YouTube or Vimeo URL"
                                                                        />
                                                                    </div>
                                                                    <Input 
                                                                        value={module.content.caption}
                                                                        onChange={(e) => updateModuleContent(module.id, 'caption', e.target.value)}
                                                                        className="text-sm"
                                                                        placeholder="Caption (optional)"
                                                                    />
                                                                </div>
                                                            )}
                                                            
                                                            {module.type === 'file_download' && (
                                                                <div className="space-y-4">
                                                                    <Input 
                                                                        value={module.content.title}
                                                                        onChange={(e) => updateModuleContent(module.id, 'title', e.target.value)}
                                                                        placeholder="Resource Title (e.g. recital_handbook.pdf)"
                                                                    />
                                                                    <Input 
                                                                        value={module.content.url}
                                                                        onChange={(e) => updateModuleContent(module.id, 'url', e.target.value)}
                                                                        placeholder="File URL"
                                                                    />
                                                                    <Input 
                                                                        value={module.content.description}
                                                                        onChange={(e) => updateModuleContent(module.id, 'description', e.target.value)}
                                                                        placeholder="Short description"
                                                                        className="text-sm text-gray-500"
                                                                    />
                                                                </div>
                                                            )}

                                                            {(module.type === 'invoice_highlight' || module.type === 'class_recommendation') && (
                                                                <div className="flex flex-col items-center justify-center py-4 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-2 shadow-sm">
                                                                        {module.type === 'invoice_highlight' ? <DollarSign className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                                                                    </div>
                                                                    <span className="text-xs font-medium">Dynamic {module.type === 'invoice_highlight' ? 'Billing' : 'Class'} Block</span>
                                                                    <span className="text-[10px]">Data will be populated automatically for the family</span>
                                                                </div>
                                                            )}
                                                            
                                                            {module.type === 'cta_button' && (
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <Input 
                                                                        value={module.content.label}
                                                                        onChange={(e) => updateModuleContent(module.id, 'label', e.target.value)}
                                                                        placeholder="Button Text"
                                                                    />
                                                                    <Input 
                                                                        value={module.content.url}
                                                                        onChange={(e) => updateModuleContent(module.id, 'url', e.target.value)}
                                                                        placeholder="https://"
                                                                    />
                                                                    <div className="col-span-2 flex items-center gap-2">
                                                                        <label className="text-xs text-gray-500">Style:</label>
                                                                        <div className="flex gap-2">
                                                                            <button 
                                                                                onClick={() => updateModuleContent(module.id, 'style', 'primary')}
                                                                                className={`px-3 py-1 rounded-full text-xs ${module.content.style !== 'outline' ? 'bg-[#333333] text-white' : 'bg-gray-100'}`}
                                                                            >Primary</button>
                                                                            <button 
                                                                                onClick={() => updateModuleContent(module.id, 'style', 'outline')}
                                                                                className={`px-3 py-1 rounded-full text-xs ${module.content.style === 'outline' ? 'bg-[#333333] text-white' : 'bg-gray-100'}`}
                                                                            >Outline</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                        
                        {activeConfig.modules.length === 0 && (
                            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-[32px] text-gray-400">
                                <p>This room is empty. Add modules from the sidebar to get started.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}