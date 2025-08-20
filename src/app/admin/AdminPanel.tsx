'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { EntryForm } from '@/components/admin/EntryForm';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, ShieldCheck, Inbox, Tag as TagIcon, CheckCircle, XCircle, Eye, LogOut, Flame, Lock } from 'lucide-react';
import type { AnyEntry, Tag, NewEntrySuggestionData, EditEntrySuggestionData, ExiconEntry, UserSubmissionBase, Alias } from '@/lib/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
    createEntryInDatabase,
    updateEntryInDatabase,
    deleteEntryFromDatabase,
    fetchTagsFromDatabase,
    createTagInDatabase,
    updateTagInDatabase,
    deleteTagFromDatabase,
    fetchPendingSubmissionsFromDatabase,
    updateSubmissionStatusInDatabase,
    applyApprovedSubmissionToDatabase,
    fetchEntryById,
    fetchAllEntries,
} from './actions';
import { getOAuthConfig } from '@/lib/auth';

interface UserInfo {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  email_verified?: boolean;
}

interface OAuthConfig {
  CLIENT_ID: string;
  REDIRECT_URI: string;
  AUTH_SERVER_URL: string;
}

export default function AdminPanel() {
    const { toast } = useToast();
    const router = useRouter();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [oauthConfig, setOauthConfig] = useState<OAuthConfig | null>(null);

    const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<AnyEntry | undefined>(undefined);

    const [tags, setTags] = useState<Tag[]>([]);
    const [isTagFormOpen, setIsTagFormOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | undefined>(undefined);
    const [newTagName, setNewTagName] = useState('');

    const [userSubmissions, setUserSubmissions] = useState<UserSubmissionBase<any>[]>([]);
    const [viewingSubmission, setViewingSubmission] = useState<UserSubmissionBase<any> | undefined>(undefined);
    const [originalEntryForEditView, setOriginalEntryForEditView] = useState<AnyEntry | null>(null);
    const [isLoadingOriginalEntry, setIsLoadingOriginalEntry] = useState(false);
    const [isSubmissionDetailOpen, setIsSubmissionDetailOpen] = useState(false);

    const [lexiconEntriesForDisplay, setLexiconEntriesForDisplay] = useState<AnyEntry[]>([]);
    const [isLoadingEntries, setIsLoadingEntries] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterLetter, setFilterLetter] = useState('All');
    const [filteredEntries, setFilteredEntries] = useState<AnyEntry[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [entriesPerPage, setEntriesPerPage] = useState(20);

    const handleLogin = () => {
        if (!oauthConfig) {
            setError('OAuth configuration not loaded');
            return;
        }

        // Generate CSRF token and create state parameter in the format expected by auth-provider
        const csrfToken = crypto.randomUUID();
        const stateData = {
            csrfToken,
            clientId: oauthConfig.CLIENT_ID,
            returnTo: oauthConfig.REDIRECT_URI,
            timestamp: Date.now(),
        };

        // Encode state as base64-encoded JSON (matching auth-provider's expectation)
        const state = btoa(JSON.stringify(stateData));
        localStorage.setItem('oauth_state', state);

        window.location.href = `${oauthConfig.AUTH_SERVER_URL}/api/oauth/authorize?response_type=code&client_id=${oauthConfig.CLIENT_ID}&redirect_uri=${encodeURIComponent(oauthConfig.REDIRECT_URI)}&scope=openid%20profile%20email&state=${encodeURIComponent(state)}`;
    };

    const handleLogout = () => {
        // Clear all stored auth data
        localStorage.removeItem('user_info');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('oauth_state');

        setUserInfo(null);
        setIsAuthenticated(false);
        setError(null);
    };

    // Load OAuth configuration and check for stored user info on component mount
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Load OAuth configuration using server action
                const config = await getOAuthConfig();
                setOauthConfig(config);

                // Check for stored user info
                const storedUserInfo = localStorage.getItem('user_info');
                if (storedUserInfo) {
                    try {
                        const parsedUserInfo = JSON.parse(storedUserInfo);
                        setUserInfo(parsedUserInfo);
                        setIsAuthenticated(true);
                    } catch (err) {
                        console.error('Failed to parse stored user info:', err);
                        localStorage.removeItem('user_info');
                    }
                }
            } catch (err) {
                console.error('Failed to load OAuth configuration:', err);
                setError('Failed to load OAuth configuration');
            } finally {
                setLoading(false);
            }
        };

        initializeApp();
    }, []);

    const refetchAllData = useCallback(async () => {
        setIsLoadingEntries(true);

        try {
            const [entries, fetchedTags, pendingSubmissions] = await Promise.all([
                fetchAllEntries(),
                fetchTagsFromDatabase(),
                fetchPendingSubmissionsFromDatabase(),
            ]);
            const sortedEntries = entries.sort((a, b) => a.name.localeCompare(b.name));
            setLexiconEntriesForDisplay(sortedEntries);
            setTags(fetchedTags.sort((a, b) => a.name.localeCompare(b.name)));
            setUserSubmissions(pendingSubmissions);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error Fetching Data",
                description: "Could not load necessary data from the database.",
                variant: "destructive",
            });
        } finally {
            setIsLoadingEntries(false);
            setCurrentPage(1);
        }
    }, [toast]);

    useEffect(() => {
        if (isAuthenticated) {
            refetchAllData();
        }
    }, [isAuthenticated, refetchAllData]);

    useEffect(() => {
        const filtered = lexiconEntriesForDisplay.filter(entry => {
            const matchesSearch = entry.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLetter = filterLetter === 'All' || entry.name.toLowerCase().startsWith(filterLetter.toLowerCase());
            return matchesSearch && matchesLetter;
        });
        setFilteredEntries(filtered);
    }, [lexiconEntriesForDisplay, searchTerm, filterLetter]);


    const handleAddNewEntry = () => {
        setEditingEntry({
            type: 'lexicon',
            id: '',
            name: '',
            description: '',
            aliases: [],
        });
        setIsEntryFormOpen(true);
    };

    const handleEditEntry = (entry: AnyEntry): void => {
        setEditingEntry(entry);
        setIsEntryFormOpen(true);
    };

    const handleDeleteEntry = async (entry: AnyEntry) => {
        if (confirm(`Are you sure you want to delete "${entry.name}"? This action cannot be undone.`)) {
            try {
                await deleteEntryFromDatabase(entry.id);
                toast({ title: "Entry Deleted", description: `"${entry.name}" has been deleted.` });
                refetchAllData();
            } catch (error) {
                console.error("Error deleting entry:", error);
                toast({ title: "Delete Failed", description: `Could not delete entry "${entry.name}".`, variant: "destructive" });
            }
        }
    };

    const handleEntryFormSubmit = async (data: AnyEntry) => {
        try {
            if (editingEntry?.id && editingEntry.id !== '') {
                const dataToUpdate = { ...data, id: editingEntry.id };
                await updateEntryInDatabase(dataToUpdate);
                toast({ title: "Entry Updated", description: `${data.name} has been updated successfully.` });
            } else {
                const dataToCreate = data as Omit<AnyEntry, 'id' | 'linkedDescriptionHtml'> & { id?: string };
                if (dataToCreate.id && (dataToCreate.id.startsWith(`${dataToCreate.type}-`) || dataToCreate.id === '')) {
                    delete dataToCreate.id;
                }
                await createEntryInDatabase(dataToCreate);
                toast({ title: "Entry Created", description: `${data.name} has been created successfully.` });
            }
            setIsEntryFormOpen(false);
            setEditingEntry(undefined);
            refetchAllData();
        } catch (error) {
            const action = (editingEntry?.id && editingEntry.id !== '') ? "Updating" : "Creating";
            console.error(`Error ${action.toLowerCase()} entry:`, error);
            toast({ title: `${action} Failed`, description: `Could not ${action.toLowerCase()} entry "${data.name}". ${(error as Error).message}`, variant: "destructive" });
        }
    };

    const handleAddNewTag = () => {
        setEditingTag(undefined);
        setNewTagName('');
        setIsTagFormOpen(true);
    };

    const handleEditTag = (tag: Tag) => {
        setEditingTag(tag);
        setNewTagName(tag.name);
        setIsTagFormOpen(true);
    };

    const handleTagFormSubmit = async () => {
        if (!newTagName.trim()) {
            toast({ title: "Tag name cannot be empty.", variant: "destructive" });
            return;
        }

        try {
            if (editingTag?.id) {
                await updateTagInDatabase(editingTag.id, newTagName);
                toast({ title: "Tag Updated", description: `Tag "${newTagName}" has been updated.` });
            } else {
                await createTagInDatabase(newTagName);
                toast({ title: "Tag Added", description: `Tag "${newTagName}" has been added.` });
            }
            refetchAllData();
            setNewTagName('');
            setEditingTag(undefined);
            setIsTagFormOpen(false);
        } catch (error) {
            const action = editingTag ? "Update" : "Add";
            console.error(`Error ${action.toLowerCase()}ing tag:`, error);
            toast({ title: `${action} Failed`, description: `Could not ${action.toLowerCase()} tag "${newTagName}". Name might be in use or another error occurred.`, variant: "destructive" });
        }
    };

    const handleDeleteTag = async (tagId: string) => {
        if (confirm(`Are you sure you want to delete this tag? This action cannot be undone and will remove the tag from all entries.`)) {
            try {
                await deleteTagFromDatabase(tagId);
                refetchAllData();
                toast({ title: "Tag Deleted" });
            } catch (error) {
                console.error("Error deleting tag:", error);
                toast({ title: "Delete Failed", description: "Could not delete tag.", variant: "destructive" });
            }
        }
    };

    const formatAliases = (aliases: string[] | Alias[] | undefined): string => {
        if (!aliases || !Array.isArray(aliases) || aliases.length === 0) return 'None';

        return aliases
            .map(alias => {
                if (typeof alias === 'string') return alias;
                if (alias && typeof alias === 'object' && 'name' in alias && typeof alias.name === 'string') return alias.name;
                return '[Invalid Alias]';
            })
            .join(', ');
    };

    const handleViewSubmission = async (submission: UserSubmissionBase<any>) => {
        setViewingSubmission(submission);
        setOriginalEntryForEditView(null);
        if (submission.submissionType === 'edit') {
            setIsLoadingOriginalEntry(true);
            try {
                const originalEntry = await fetchEntryById((submission.data as EditEntrySuggestionData).entryId);
                setOriginalEntryForEditView(originalEntry);
            } catch (error) {
                console.error("Error fetching original entry for submission view:", error);
                toast({ title: "Error", description: "Could not load original entry details.", variant: "destructive" });
            } finally {
                setIsLoadingOriginalEntry(false);
            }
        }
        setIsSubmissionDetailOpen(true);
    };

    const handleApproveSubmission = async (submissionId: number) => {
        const submission = userSubmissions.find(s => s.id === submissionId);
        if (submission) {
            try {
                await applyApprovedSubmissionToDatabase(submission);
                await updateSubmissionStatusInDatabase(submissionId, 'approved');
                toast({ title: "Submission Approved", description: `Submission ID "${submissionId}" has been approved.` });
                refetchAllData();
                if (viewingSubmission?.id === submissionId) setIsSubmissionDetailOpen(false);
            } catch (error) {
                console.error("Error approving submission:", error);
                toast({ title: "Approval Failed", description: `Could not approve submission ID "${submissionId}". Details: ${(error as Error).message}`, variant: "destructive" });
            }
        }
    };

    const handleRejectSubmission = async (submissionId: number) => {
        const submission = userSubmissions.find(s => s.id === submissionId);
        if (submission) {
            try {
                await updateSubmissionStatusInDatabase(submissionId, 'rejected');
                toast({ title: "Submission Rejected", description: `Submission ID "${submissionId}" has been rejected.` });
                refetchAllData();
                if (viewingSubmission?.id === submissionId) setIsSubmissionDetailOpen(false);
            } catch (error) {
                console.error("Error rejecting submission:", error);
                toast({ title: "Reject Failed", description: `Could not reject submission ID "${submissionId}".`, variant: "destructive" });
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Logging you in...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="relative">
                                <Flame className="h-12 w-12 text-primary" />
                                <Lock className="h-6 w-6 text-muted-foreground absolute -bottom-1 -right-1 bg-background rounded-full p-1" />
                            </div>
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold">Secure Admin Access</CardTitle>
                            <CardDescription className="mt-2">
                                Please log in with your F3 credentials to access admin tools.
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {error && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                                <p className="text-destructive text-sm">{error}</p>
                            </div>
                        )}

                        <div className="text-center">
                            <Button
                                onClick={handleLogin}
                                className="w-full"
                                size="lg"
                            >
                                Login with F3 Nation
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <PageContainer>
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                    <ShieldCheck className="h-16 w-16 text-primary mx-auto sm:mx-0 mb-4" />
                    <h1 className="text-3xl md:text-4xl font-bold">Admin Panel</h1>
                    <p className="text-lg text-muted-foreground mt-2">Manage Exicon, Lexicon, Tags, and User Submissions.</p>
                </div>
                <Dialog open={isEntryFormOpen} onOpenChange={(isOpen) => {
                    setIsEntryFormOpen(isOpen);
                    if (!isOpen) {
                        setEditingEntry(undefined);
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={handleAddNewEntry} className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-5 w-5" /> Add New Entry
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{(editingEntry?.id && editingEntry.id !== '') ? 'Edit Entry' : 'Create New Entry'}</DialogTitle>
                        </DialogHeader>
                        <EntryForm
                            key={editingEntry ? editingEntry.id : 'new-entry-form'}
                            entryToEdit={editingEntry}
                            onFormSubmit={handleEntryFormSubmit}
                            allTags={tags}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="shadow-lg mb-8">
                <CardHeader>
                    <CardTitle>Manage Entries</CardTitle>
                    <CardDescription>View, edit, or delete existing Lexicon entries.</CardDescription>
                </CardHeader>
                <CardHeader className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <Input
                        placeholder="Search entries..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full md:max-w-sm"
                    />
                    <div className="flex flex-wrap gap-1 justify-center md:justify-end">
                        {['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map((letter) => (
                            <Button
                                key={letter}
                                size="sm"
                                variant={filterLetter === letter ? 'default' : 'outline'}
                                onClick={() => {
                                    setFilterLetter(letter);
                                    setCurrentPage(1);
                                }}
                            >
                                {letter}
                            </Button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description (Snippet)</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingEntries ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            Loading entries...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredEntries.length > 0 ? (
                                    filteredEntries
                                        .slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage)
                                        .map((entry) => (
                                            <TableRow key={entry.id}>
                                                <TableCell className="font-medium">{entry.name}</TableCell>
                                                <TableCell className="capitalize">{entry.type}</TableCell>
                                                <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEditEntry(entry)}
                                                        className="mr-2 hover:text-accent"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                        <span className="sr-only">Edit</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteEntry(entry)}
                                                        className="hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            No entries found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center pt-4">
                    <Button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1 || filteredEntries.length === 0}
                        variant="outline"
                    >
                        Previous
                    </Button>
                    <span>
                        Page {filteredEntries.length > 0 ? currentPage : 0} of {Math.ceil(filteredEntries.length / entriesPerPage)}
                    </span>
                    <Button
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={currentPage * entriesPerPage >= filteredEntries.length || filteredEntries.length === 0}
                        variant="outline"
                    >
                        Next
                    </Button>
                </CardFooter>
            </Card>

            <Card className="shadow-lg mb-8">
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Manage Tags</CardTitle>
                        <CardDescription>Add, edit, or delete tags used for Exicon entries.</CardDescription>
                    </div>
                    <Dialog open={isTagFormOpen} onOpenChange={(isOpen) => {
                        setIsTagFormOpen(isOpen);
                        if (!isOpen) {
                            setEditingTag(undefined);
                            setNewTagName('');
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={handleAddNewTag} variant="outline">
                                <TagIcon className="mr-2 h-4 w-4" /> Add New Tag
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{editingTag ? 'Edit Tag' : 'Add New Tag'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => { e.preventDefault(); handleTagFormSubmit(); }}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="tagName" className="text-right">
                                            Name
                                        </Label>
                                        <Input
                                            id="tagName"
                                            value={newTagName}
                                            onChange={(e) => setNewTagName(e.target.value)}
                                            className="col-span-3"
                                            required
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsTagFormOpen(false)}>Cancel</Button>
                                    <Button type="submit">{editingTag ? 'Save Changes' : 'Add Tag'}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {tags.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tag Name</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tags.map((tag) => (
                                        <TableRow key={tag.id}>
                                            <TableCell>{tag.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditTag(tag)} className="mr-2 hover:text-accent">
                                                    <Edit className="h-4 w-4" />
                                                    <span className="sr-only">Edit Tag</span>
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteTag(tag.id)} className="hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Delete Tag</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No tags found. Add some tags to get started.</p>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Inbox className="h-6 w-6 text-primary" />User Submissions</CardTitle>
                    <CardDescription>Review and approve/reject new entries or edits submitted by users.</CardDescription>
                </CardHeader>
                <CardContent>
                    {userSubmissions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Entry Name / Suggested</TableHead>
                                        <TableHead>Submitter</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {userSubmissions.map((submission) => (
                                        <TableRow key={submission.id}>
                                            <TableCell className="capitalize">
                                                <Badge variant={submission.submissionType === 'new' ? 'default' : 'secondary'}>
                                                    {submission.submissionType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {submission.submissionType === 'new' ? (submission.data as NewEntrySuggestionData).name : (submission.data as EditEntrySuggestionData).entryName}
                                            </TableCell>
                                            <TableCell>{submission.submitterName || 'Anonymous'}</TableCell>
                                            <TableCell>{new Date(submission.timestamp).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleViewSubmission(submission)} className="hover:text-accent">
                                                    <Eye className="h-4 w-4" />
                                                    <span className="sr-only">View Details</span>
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleApproveSubmission(submission.id)} className="text-green-600 hover:text-green-500">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="sr-only">Approve</span>
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleRejectSubmission(submission.id)} className="text-red-600 hover:text-red-500">
                                                    <XCircle className="h-4 w-4" />
                                                    <span className="sr-only">Reject</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No pending submissions.</p>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isSubmissionDetailOpen} onOpenChange={setIsSubmissionDetailOpen}>
                <DialogContent className="sm:max-w-[725px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Submission Details</DialogTitle>
                        <DialogDescription>
                            Reviewing {viewingSubmission?.submissionType === 'new' ? 'new entry suggestion' : `edit suggestion for "${(viewingSubmission?.data as EditEntrySuggestionData)?.entryName}"`}.
                        </DialogDescription>
                    </DialogHeader>
                    {isLoadingOriginalEntry && <p className="text-center py-4">Loading original entry details...</p>}
                    {!isLoadingOriginalEntry && viewingSubmission && (
                        <div className="py-4 space-y-4">
                            <p><strong>Submitter:</strong> {viewingSubmission.submitterName || 'Anonymous'} ({viewingSubmission.submitterEmail || 'No Email'})</p>
                            <p><strong>Date:</strong> {new Date(viewingSubmission.timestamp).toLocaleString()}</p>

                            <Separator />

                            {viewingSubmission.submissionType === 'new' && (
                                <>
                                    <h4 className="font-semibold">New Entry Details:</h4>
                                    <p><strong>Type:</strong> {(viewingSubmission.data as NewEntrySuggestionData).entryType}</p>
                                    <p><strong>Name:</strong> {(viewingSubmission.data as NewEntrySuggestionData).name}</p>
                                    <p><strong>Description:</strong></p>
                                    <Textarea value={(viewingSubmission.data as NewEntrySuggestionData).description} readOnly rows={5} />
                                    {(viewingSubmission.data as NewEntrySuggestionData).aliases && ((viewingSubmission.data as NewEntrySuggestionData).aliases?.length ?? 0) > 0 && (
                                        <p><strong>Aliases:</strong> {formatAliases((viewingSubmission.data as NewEntrySuggestionData).aliases)}</p>
                                    )}
                                    {(viewingSubmission.data as NewEntrySuggestionData).entryType === 'exicon' && (
                                        <>
                                            {((viewingSubmission.data as NewEntrySuggestionData).tags?.length ?? 0) > 0 && <p><strong>Tags:</strong> {(viewingSubmission.data as NewEntrySuggestionData).tags?.join(', ')}</p>}
                                            {(viewingSubmission.data as NewEntrySuggestionData).videoLink && <p><strong>Video Link:</strong> {(viewingSubmission.data as NewEntrySuggestionData).videoLink}</p>}
                                        </>
                                    )}
                                </>
                            )}

                            {viewingSubmission.submissionType === 'edit' && originalEntryForEditView && (
                                <>
                                    <h4 className="font-semibold">Suggested Changes:</h4>
                                    {(viewingSubmission.data as EditEntrySuggestionData).changes.description !== undefined && (
                                        <div>
                                            <p><strong>Current Description:</strong></p>
                                            <Textarea value={originalEntryForEditView.description || 'N/A'} readOnly rows={3} className="mb-1 bg-muted/50" />
                                            <p><strong>Suggested Description:</strong></p>
                                            <Textarea value={(viewingSubmission.data as EditEntrySuggestionData).changes.description} readOnly rows={3} />
                                        </div>
                                    )}
                                    {(viewingSubmission.data as EditEntrySuggestionData).changes.aliases !== undefined && (
                                        <div>
                                            <p><strong>Current Aliases:</strong> {formatAliases(originalEntryForEditView.aliases)}</p>
                                            <p><strong>Suggested Aliases:</strong> {formatAliases((viewingSubmission.data as EditEntrySuggestionData).changes.aliases)}</p>
                                        </div>
                                    )}
                                    {(viewingSubmission.data as EditEntrySuggestionData).changes.entryType !== undefined && (
                                        <div>
                                            <p><strong>Current Type:</strong> {originalEntryForEditView.type}</p>
                                            <p><strong>Suggested Type:</strong> {(viewingSubmission.data as EditEntrySuggestionData).changes.entryType}</p>
                                        </div>
                                    )}
                                    {(
                                        ((viewingSubmission.data as EditEntrySuggestionData).changes as { entryType?: AnyEntry['type'] }).entryType === 'exicon' ||
                                        originalEntryForEditView?.type === 'exicon'
                                    ) && (
                                            <>
                                                {(viewingSubmission.data as EditEntrySuggestionData).changes.videoLink !== undefined && (
                                                    <div>
                                                        <p><strong>Current Video Link:</strong> {(originalEntryForEditView as ExiconEntry)?.videoLink || 'None'}</p>
                                                        <p><strong>Suggested Video Link:</strong> {(viewingSubmission.data as EditEntrySuggestionData).changes.videoLink || 'None'}</p>
                                                    </div>
                                                )}
                                                {(viewingSubmission.data as EditEntrySuggestionData).changes.tags !== undefined && (
                                                    <div>
                                                        <p><strong>Current Tags:</strong> {formatAliases((originalEntryForEditView as ExiconEntry)?.tags?.map(t => t.name)) || 'None'}</p>
                                                        <p><strong>Suggested Tags:</strong> {formatAliases((viewingSubmission.data as EditEntrySuggestionData).changes.tags) || 'None'}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                </>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Close</Button>
                        </DialogClose>
                        {viewingSubmission && (
                            <>
                                <Button onClick={() => handleApproveSubmission(viewingSubmission.id)} className="bg-green-600 hover:bg-green-700 text-white">Approve</Button>
                                <Button onClick={() => handleRejectSubmission(viewingSubmission.id)} className="bg-red-600 hover:bg-red-700 text-white">Reject</Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
