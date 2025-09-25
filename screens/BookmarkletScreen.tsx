import React, { useState } from 'react';
import { IconArrowLeft, IconBookmarkPlus, IconCopy, IconCheck } from '../components/icons';

interface BookmarkletScreenProps {
  onBack: () => void;
}

const BookmarkletScreen: React.FC<BookmarkletScreenProps> = ({ onBack }) => {
    const [copied, setCopied] = useState(false);

    // This creates the bookmarklet code dynamically based on the current app's origin
    const bookmarkletCode = `javascript:(function(){const url='${window.location.origin}${window.location.pathname}#/home?url='+encodeURIComponent(window.location.href)+'&title='+encodeURIComponent(document.title);window.open(url,'_blank');})();`;
    
    const handleCopy = () => {
        navigator.clipboard.writeText(bookmarkletCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <header className="mb-6">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline mb-4">
                    <IconArrowLeft size={16} />
                    Back to My Bundles
                </button>
                <h1 className="text-3xl font-bold text-foreground">Quick Add Bookmarklet</h1>
                <p className="text-muted-foreground mt-2">Save links to StaticLink from any website with a single click.</p>
            </header>

            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                <div>
                    <h2 className="text-xl font-semibold text-card-foreground">How It Works</h2>
                    <p className="text-muted-foreground mt-2">
                        The bookmarklet is a special browser bookmark. When you're on a webpage you want to save, just click it. A new StaticLink tab will open, ready to add the link to your 'Inbox' bundle.
                    </p>
                </div>
                
                <div>
                    <h2 className="text-xl font-semibold text-card-foreground">Setup Instructions</h2>
                    <ol className="list-decimal list-inside space-y-3 mt-4 text-muted-foreground">
                        <li>
                            <strong className="text-foreground">Drag this link to your bookmarks bar:</strong>
                            <div className="mt-2">
                                <a 
                                    href={bookmarkletCode}
                                    onClick={(e) => e.preventDefault()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90"
                                    title="Drag me to your bookmarks bar"
                                >
                                    <IconBookmarkPlus size={16} />
                                    Add to StaticLink
                                </a>
                            </div>
                        </li>
                        <li>
                            <strong className="text-foreground">Or, create a bookmark manually:</strong>
                            <p>Create a new bookmark in your browser, name it whatever you like (e.g., "Add to StaticLink"), and paste the code below into the URL/Address field.</p>
                            <div className="mt-2 relative">
                                <pre className="bg-muted p-4 rounded-md text-sm text-foreground overflow-x-auto">
                                    <code>{bookmarkletCode}</code>
                                </pre>
                                <button onClick={handleCopy} className="absolute top-2 right-2 p-2 bg-card rounded-md hover:bg-accent text-muted-foreground">
                                    {copied ? <IconCheck size={16} className="text-green-500" /> : <IconCopy size={16} />}
                                </button>
                            </div>
                        </li>
                         <li>
                            <strong className="text-foreground">You're all set!</strong>
                            <p>Navigate to any website, click your new bookmark, and see the magic happen.</p>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default BookmarkletScreen;