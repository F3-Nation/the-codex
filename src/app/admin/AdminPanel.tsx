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
import { PlusCircle, Edit, Trash2, ShieldCheck, Inbox, Tag as TagIcon, CheckCircle, XCircle, Eye, LogOut, Flame, Lock, Pencil, Save, X } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
    verifyAdminEmail,
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
    const [oauthConfig, setOauthConfig] = useState<OAuthConfig | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<AnyEntry | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [tags, setTags] = useState<Tag[]>([]);
    const [isTagFormOpen, setIsTagFormOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | undefined>(undefined);
    const [newTagName, setNewTagName] = useState('');

    const [userSubmissions, setUserSubmissions] = useState<UserSubmissionBase<any>[]>([]);
    const [viewingSubmission, setViewingSubmission] = useState<UserSubmissionBase<any> | undefined>(undefined);
    const [editedSubmissionData, setEditedSubmissionData] = useState<NewEntrySuggestionData | EditEntrySuggestionData | undefined>(undefined);
    const [isEditingSubmission, setIsEditingSubmission] = useState(false);
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

    // Authentication handlers
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

    const handleLogout = useCallback(() => {
        // Clear all stored auth data
        localStorage.removeItem('user_info');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('oauth_state');

        setUserInfo(null);
        setIsAuthenticated(false);
        setError(null);
    }, []);

    // Initialize OAuth configuration and check for stored user info
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
                        const parsedUserInfo: UserInfo = JSON.parse(storedUserInfo);
                        if (parsedUserInfo?.email) {
                            try {
                                const hasAccess = await verifyAdminEmail(parsedUserInfo.email);
                                if (hasAccess) {
                                    setUserInfo(parsedUserInfo);
                                    setIsAuthenticated(true);
                                    setError(null);
                                } else {
                                    handleLogout();
                                    setError('You do not have admin access. Please contact the Codex team if you believe this is a mistake.');
                                }
                            } catch (verificationError) {
                                console.error('Failed to verify admin access:', verificationError);
                                setIsAuthenticated(false);
                                setError('Failed to verify admin access. Please try again later.');
                            }
                        } else {
                            handleLogout();
                            setError('Unable to determine the authenticated email address. Please log in again.');
                        }
                    } catch (parseError) {
                        console.error('Failed to parse stored user info:', parseError);
                        localStorage.removeItem('user_info');
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                    }
                }
            } catch (err) {
                setError('Failed to load OAuth configuration');
            } finally {
                setLoading(false);
            }
        };

        initializeApp();
    }, [handleLogout, verifyAdminEmail]);

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
                await refetchAllData();
            } catch (error) {

                toast({ title: "Delete Failed", description: `Could not delete entry "${entry.name}".`, variant: "destructive" });
            }
        }
    };

    const handleEntryFormSubmit = async (data: AnyEntry): Promise<void> => {
        setIsSubmitting(true);
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

            await refetchAllData();

            setIsEntryFormOpen(false);
            setEditingEntry(undefined);

        } catch (error) {
            const action = (editingEntry?.id && editingEntry.id !== '') ? "Updating" : "Creating";


            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            toast({
                title: `${action} Failed`,
                description: `Could not ${action.toLowerCase()} entry "${data.name}". ${errorMessage}`,
                variant: "destructive"
            });
            throw error;
        } finally {
            setIsSubmitting(false);
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
            await refetchAllData();
            setNewTagName('');
            setEditingTag(undefined);
            setIsTagFormOpen(false);
        } catch (error) {
            const action = editingTag ? "Update" : "Add";

            toast({ title: `${action} Failed`, description: `Could not ${action.toLowerCase()} tag "${newTagName}". Name might be in use or another error occurred.`, variant: "destructive" });
        }
    };

    const handleDeleteTag = async (tagId: string) => {
        if (confirm(`Are you sure you want to delete this tag? This action cannot be undone and will remove the tag from all entries.`)) {
            try {
                await deleteTagFromDatabase(tagId);
                await refetchAllData();
                toast({ title: "Tag Deleted" });
            } catch (error) {

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
        setEditedSubmissionData(JSON.parse(JSON.stringify(submission.data))); // Deep clone
        setIsEditingSubmission(false);
        setOriginalEntryForEditView(null);
        if (submission.submissionType === 'edit') {
            setIsLoadingOriginalEntry(true);
            try {
                const originalEntry = await fetchEntryById((submission.data as EditEntrySuggestionData).entryId);
                setOriginalEntryForEditView(originalEntry);
            } catch (error) {

                toast({ title: "Error", description: "Could not load original entry details.", variant: "destructive" });
            } finally {
                setIsLoadingOriginalEntry(false);
            }
        }
        setIsSubmissionDetailOpen(true);
    };

    const handleStartEditingSubmission = () => {
        setIsEditingSubmission(true);
    };

    const handleCancelEditingSubmission = () => {
        if (viewingSubmission) {
            setEditedSubmissionData(JSON.parse(JSON.stringify(viewingSubmission.data)));
        }
        setIsEditingSubmission(false);
    };

    const handleSaveSubmissionEdits = () => {
        if (viewingSubmission && editedSubmissionData) {
            setViewingSubmission({ ...viewingSubmission, data: editedSubmissionData });
        }
        setIsEditingSubmission(false);
        toast({ title: "Changes Saved", description: "Your edits have been saved. You can now approve the submission." });
    };

    const handleApproveSubmission = async (submissionId: number) => {
        const submission = userSubmissions.find(s => s.id === submissionId);
        if (submission) {
            try {
                await applyApprovedSubmissionToDatabase(submission);
                await updateSubmissionStatusInDatabase(submissionId, 'approved', submission);
                toast({ title: "Submission Approved", description: `Submission ID "${submissionId}" has been approved.` });
                await refetchAllData();
                if (viewingSubmission?.id === submissionId) setIsSubmissionDetailOpen(false);
            } catch (error) {

                toast({ title: "Approval Failed", description: `Could not approve submission ID "${submissionId}". Details: ${(error as Error).message}`, variant: "destructive" });
            }
        }
    };

    const handleRejectSubmission = async (submissionId: number) => {
        const submission = userSubmissions.find(s => s.id === submissionId);
        if (submission) {
            try {
                await updateSubmissionStatusInDatabase(submissionId, 'rejected', submission);
                toast({ title: "Submission Rejected", description: `Submission ID "${submissionId}" has been rejected.` });
                await refetchAllData();
                if (viewingSubmission?.id === submissionId) setIsSubmissionDetailOpen(false);
            } catch (error) {

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

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => window.location.reload()}>Reload Page</Button>
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
                    {userInfo && (
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                            <span>Welcome, {userInfo.name || userInfo.email || 'User'}</span>
                            <Button variant="ghost" size="sm" onClick={handleLogout} className="h-auto p-1">
                                <LogOut className="h-4 w-4 mr-1" />
                                Logout
                            </Button>
                        </div>
                    )}
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
                            isSubmitting={isSubmitting}
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
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle>{isEditingSubmission ? 'Edit Submission' : 'Submission Details'}</DialogTitle>
                                <DialogDescription>
                                    {isEditingSubmission ? 'Make any necessary changes before approving' : 'Reviewing'} {viewingSubmission?.submissionType === 'new' ? 'new entry suggestion' : `edit suggestion for `}
                                    <span className="font-bold">
                                        {viewingSubmission?.submissionType === 'new'
                                            ? (viewingSubmission.data as NewEntrySuggestionData).name
                                            : (viewingSubmission?.data as EditEntrySuggestionData)?.entryName}
                                    </span>
                                </DialogDescription>
                            </div>
                            {!isEditingSubmission && (
                                <Button variant="outline" size="sm" onClick={handleStartEditingSubmission}>
                                    <Pencil className="h-4 w-4 mr-2" /> Edit
                                </Button>
                            )}
                        </div>
                    </DialogHeader>
                    {viewingSubmission && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold">Submission Info</h3>
                                    <p className="text-sm text-muted-foreground">Submitted by: {viewingSubmission.submitterName || 'Anonymous'}</p>
                                    <p className="text-sm text-muted-foreground">Date: {new Date(viewingSubmission.timestamp).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">Change Type</h3>
                                    <p className="text-sm">
                                        <Badge variant={viewingSubmission.submissionType === 'new' ? 'default' : 'secondary'} className="capitalize">
                                            {viewingSubmission.submissionType}
                                        </Badge>
                                    </p>
                                    {viewingSubmission.submissionType === 'edit' && (
                                        <p className="text-sm mt-2">
                                            Original Entry ID: <span className="font-mono text-xs">{(viewingSubmission.data as EditEntrySuggestionData).entryId}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {viewingSubmission.submissionType === 'new' ? (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">New Entry Details</h3>
                                    {isEditingSubmission && editedSubmissionData ? (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-name">Name</Label>
                                                <Input
                                                    id="edit-name"
                                                    value={(editedSubmissionData as NewEntrySuggestionData).name}
                                                    onChange={(e) => setEditedSubmissionData({ ...editedSubmissionData, name: e.target.value } as NewEntrySuggestionData)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-description">Description</Label>
                                                <Textarea
                                                    id="edit-description"
                                                    value={(editedSubmissionData as NewEntrySuggestionData).description}
                                                    onChange={(e) => setEditedSubmissionData({ ...editedSubmissionData, description: e.target.value } as NewEntrySuggestionData)}
                                                    rows={5}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-aliases">Aliases (comma-separated)</Label>
                                                <Input
                                                    id="edit-aliases"
                                                    value={((editedSubmissionData as NewEntrySuggestionData).aliases || []).join(', ')}
                                                    onChange={(e) => setEditedSubmissionData({
                                                        ...editedSubmissionData,
                                                        aliases: e.target.value.split(',').map(a => a.trim()).filter(Boolean)
                                                    } as NewEntrySuggestionData)}
                                                />
                                            </div>
                                            {(editedSubmissionData as NewEntrySuggestionData).entryType === 'exicon' && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label>Tags</Label>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border rounded-md max-h-48 overflow-y-auto">
                                                            {tags.map(tag => (
                                                                <div key={tag.id} className="flex items-center space-x-2">
                                                                    <Checkbox
                                                                        id={`edit-tag-${tag.id}`}
                                                                        checked={((editedSubmissionData as NewEntrySuggestionData).tags || []).includes(tag.name)}
                                                                        onCheckedChange={(checked) => {
                                                                            const currentTags = (editedSubmissionData as NewEntrySuggestionData).tags || [];
                                                                            const newTags = checked
                                                                                ? [...currentTags, tag.name]
                                                                                : currentTags.filter(t => t !== tag.name);
                                                                            setEditedSubmissionData({ ...editedSubmissionData, tags: newTags } as NewEntrySuggestionData);
                                                                        }}
                                                                    />
                                                                    <Label htmlFor={`edit-tag-${tag.id}`} className="font-normal">{tag.name}</Label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="edit-videoLink">Video Link</Label>
                                                        <Input
                                                            id="edit-videoLink"
                                                            type="url"
                                                            value={(editedSubmissionData as NewEntrySuggestionData).videoLink || ''}
                                                            onChange={(e) => setEditedSubmissionData({ ...editedSubmissionData, videoLink: e.target.value } as NewEntrySuggestionData)}
                                                            placeholder="https://youtube.com/watch?v=..."
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto border rounded-md">
                                            <Table>
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell className="font-medium">Name</TableCell>
                                                        <TableCell>{(viewingSubmission.data as NewEntrySuggestionData).name}</TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell className="font-medium">Description</TableCell>
                                                        <TableCell className="whitespace-pre-wrap">{(viewingSubmission.data as NewEntrySuggestionData).description}</TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell className="font-medium">Aliases</TableCell>
                                                        <TableCell>{formatAliases((viewingSubmission.data as NewEntrySuggestionData).aliases)}</TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell className="font-medium">Type</TableCell>
                                                        <TableCell className="capitalize">{(viewingSubmission.data as NewEntrySuggestionData).entryType}</TableCell>
                                                    </TableRow>
                                                    {(viewingSubmission.data as NewEntrySuggestionData).entryType === 'exicon' && (
                                                        <>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Tags</TableCell>
                                                                <TableCell>
                                                                    {((viewingSubmission.data as NewEntrySuggestionData).tags || []).length > 0
                                                                        ? ((viewingSubmission.data as NewEntrySuggestionData).tags || []).map(tagName => tagName).join(', ')
                                                                        : 'None'}
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Video Link</TableCell>
                                                                <TableCell>{(viewingSubmission.data as NewEntrySuggestionData).videoLink || 'None'}</TableCell>
                                                            </TableRow>
                                                        </>
                                                    )}
                                                    <TableRow>
                                                        <TableCell className="font-medium">References</TableCell>
                                                        <TableCell>
                                                            {((viewingSubmission.data as NewEntrySuggestionData).mentionedEntries || []).length > 0
                                                                ? ((viewingSubmission.data as NewEntrySuggestionData).mentionedEntries || []).join(', ')
                                                                : 'None'}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <h4 className="text-lg font-semibold">Comments</h4>
                                        <p className="text-sm text-muted-foreground">{(viewingSubmission.data as NewEntrySuggestionData).comments || 'No comments provided.'}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Comparison of Changes</h3>
                                    {isLoadingOriginalEntry ? (
                                        <div className="text-center py-8">Loading original entry...</div>
                                    ) : originalEntryForEditView ? (
                                        <div className="overflow-x-auto border rounded-md">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Field</TableHead>
                                                        <TableHead>Original</TableHead>
                                                        <TableHead>Suggested Change</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell className="font-medium">Name</TableCell>
                                                        <TableCell>{originalEntryForEditView.name}</TableCell>
                                                        <TableCell>{(viewingSubmission.data as EditEntrySuggestionData).changes.name}</TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell className="font-medium">Description</TableCell>
                                                        <TableCell>{originalEntryForEditView.description}</TableCell>
                                                        <TableCell>{(viewingSubmission.data as EditEntrySuggestionData).changes.description}</TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell className="font-medium">Aliases</TableCell>
                                                        <TableCell>{formatAliases(originalEntryForEditView.aliases)}</TableCell>
                                                        <TableCell>{formatAliases((viewingSubmission.data as EditEntrySuggestionData).changes.aliases)}</TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell className="font-medium">Type</TableCell>
                                                        <TableCell className="capitalize">{originalEntryForEditView.type}</TableCell>
                                                        <TableCell className="capitalize">{(viewingSubmission.data as EditEntrySuggestionData).changes.entryType}</TableCell>
                                                    </TableRow>
                                                    {originalEntryForEditView.type === 'exicon' && (
                                                        <>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Tags</TableCell>
                                                                <TableCell>
                                                                    {((originalEntryForEditView as ExiconEntry).tags || []).length > 0
                                                                        ? ((originalEntryForEditView as ExiconEntry).tags || []).map(tag => tag.name).join(', ')
                                                                        : 'None'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {((viewingSubmission.data as EditEntrySuggestionData).changes.tags || []).length > 0
                                                                        ? ((viewingSubmission.data as EditEntrySuggestionData).changes.tags || []).map(tagId => tags.find(t => t.id === tagId)?.name || 'Unknown').join(', ')
                                                                        : 'None'}
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell className="font-medium">Video Link</TableCell>
                                                                <TableCell>{(originalEntryForEditView as ExiconEntry).videoLink || 'None'}</TableCell>
                                                                <TableCell>{(viewingSubmission.data as EditEntrySuggestionData).changes.videoLink || 'None'}</TableCell>
                                                            </TableRow>
                                                        </>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground">Original entry could not be loaded.</p>
                                    )}
                                    <div className="space-y-2">
                                        <h4 className="text-lg font-semibold">Comments</h4>
                                        <p className="text-sm text-muted-foreground">{(viewingSubmission.data as EditEntrySuggestionData).changes.comments || 'No comments provided.'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="mt-4">
                        {isEditingSubmission ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleCancelEditingSubmission}
                                >
                                    <X className="h-4 w-4 mr-2" /> Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveSubmissionEdits}
                                >
                                    <Save className="h-4 w-4 mr-2" /> Save Changes
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleRejectSubmission(viewingSubmission?.id!)}
                                    disabled={!viewingSubmission || isSubmitting}
                                >
                                    <XCircle className="h-4 w-4 mr-2" /> Reject
                                </Button>
                                <DialogClose asChild>
                                    <Button
                                        onClick={() => handleApproveSubmission(viewingSubmission?.id!)}
                                        disabled={!viewingSubmission || isSubmitting}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" /> Approve
                                    </Button>
                                </DialogClose>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
