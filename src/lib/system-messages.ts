/**
 * Centralized user-facing strings for the entire application.
 * Import from here instead of using inline strings.
 */

export const MESSAGES = {
  // --- Error Messages ---
  errors: {
    unauthorized: 'You must be logged in to perform this action.',
    forbidden: 'You do not have permission to perform this action.',
    notFound: 'The requested resource was not found.',
    validation: 'Please check the form and fix any errors.',
    rateLimited: 'Too many attempts. Please try again in a few minutes.',
    passwordAttempts: 'Too many password attempts. Please wait 15 minutes.',
    maxUsersReached: 'Maximum of 30 users per organization reached.',
    maxChatbotsReached: 'Maximum of 5,000 chatbots per organization reached.',
    maxStepsReached: 'Maximum of 500 steps per chatbot reached.',
    maxBlocksReached: 'Maximum of 200 blocks per project canvas reached.',
    networkError: 'Network error. Please check your connection and try again.',
    saveError: 'Failed to save changes. Please try again.',
    loadError: 'Failed to load data. Please try again.',
    importError: 'Import failed. Please check the file format and try again.',
    deleteError: 'Failed to delete. Please try again.',
    lockError: 'This project is currently being edited by another user.',
    invalidCredentials: 'Invalid email or password.',
    invalidToken: 'Invalid or expired invite token.',
    invalidSharePassword: 'Incorrect password.',
    shareExpired: 'This share link has expired.',
    shareRevoked: 'This share link has been revoked.',
  },

  // --- Success Messages ---
  success: {
    saved: 'Changes saved.',
    created: 'Created successfully.',
    deleted: 'Moved to trash.',
    deletedPermanently: 'Permanently deleted.',
    restored: 'Restored successfully.',
    imported: (count: number) => `${count} item${count !== 1 ? 's' : ''} imported.`,
    exported: 'Export complete.',
    transformed: (count: number) => `Transformation complete. ${count} step${count !== 1 ? 's' : ''} created.`,
    shared: 'Share link copied!',
    shareCreated: 'Share link created.',
    shareRevoked: 'Share link revoked.',
    versionCreated: 'Version snapshot created.',
    versionRestored: 'Version restored.',
    copied: 'Copied to clipboard.',
    activated: 'Chatbot activated.',
    deactivated: 'Chatbot deactivated.',
    duplicated: 'Duplicated successfully.',
    passwordReset: 'Password has been reset.',
    roleUpdated: 'User role updated.',
    commentAdded: 'Comment added.',
    commentResolved: 'Comment resolved.',
    todoCreated: 'Todo created.',
    todoCompleted: 'Todo completed.',
    notificationSaved: 'Notification settings saved.',
  },

  // --- Confirmation Dialogs ---
  confirm: {
    deleteChatbot: 'Move this chatbot to trash? You can restore it within 30 days.',
    deleteProject: 'Delete this project? This action cannot be undone.',
    deleteStep: 'Delete this step? All connections to this step will also be removed.',
    deleteVersion: 'Delete this version snapshot? This cannot be undone.',
    revokeShare: 'Revoke this share link? Anyone with this link will lose access.',
    transform: 'Transform this project to development mode? This will create runtime steps from your design.',
    emptyTrash: 'Permanently delete all items in trash? This cannot be undone.',
    deleteUser: 'Remove this user? They will lose access to all projects.',
    deleteComment: 'Delete this comment?',
    deleteTodo: 'Delete this todo?',
    deleteNotification: 'Delete this notification rule?',
  },

  // --- Empty States ---
  empty: {
    projects: 'Create your first project',
    projectsDescription: 'Design chatbot conversation flows visually on a canvas.',
    chatbots: 'Create your first chatbot',
    chatbotsDescription: 'Build and deploy interactive chatbots for your website.',
    conversations: 'No conversations yet. Embed the widget to start collecting data.',
    comments: 'No comments yet.',
    commentsDescription: 'Add comments to discuss design decisions.',
    todos: 'All caught up!',
    todosDescription: 'Create todos to track work items for this project.',
    shares: 'Share this project with your client.',
    sharesDescription: 'Generate a link to let others view your chatbot design.',
    versions: 'No version snapshots yet.',
    versionsDescription: 'Create a snapshot to save your current progress.',
    notifications: 'No notification rules.',
    notificationsDescription: 'Set up email alerts for chatbot events.',
    steps: 'No steps yet. Add your first step.',
    trash: 'Trash is empty.',
    organizations: 'No organizations yet.',
    organizationsDescription: 'Create an organization to manage your chatbots.',
    searchNoResults: 'No results found.',
    searchNoResultsDescription: 'Try adjusting your search terms.',
    logs: 'No conversations found.',
    logsDescription: 'Conversations will appear here once users interact with your chatbot.',
    users: 'No users yet. Invite your first team member.',
    imports: 'No imports yet.',
  },

  // --- Chatbot Runtime Defaults ---
  chatbotDefaults: {
    noResponse: 'No response configured for this step.',
    invalidInput: 'Please provide a valid response.',
    sessionExpired: 'Your session has expired. Please refresh to start again.',
    welcomeMessage: 'Hello! How can I help you today?',
    fallbackMessage: 'I didn\'t understand that. Please try again.',
    completionMessage: 'Thank you for your time!',
  },

  // --- Constraints ---
  constraints: {
    maxUsersPerOrg: 30,
    maxStepsPerChatbot: 500,
    maxChatbotsPerOrg: 5000,
    maxBlocksPerProject: 200,
    maxPasswordAttempts: 5,
    passwordLockoutMinutes: 15,
    trashRetentionDays: 30,
  },
} as const;
