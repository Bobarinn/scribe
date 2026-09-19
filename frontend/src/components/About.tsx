import React, { useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import Image from 'next/image';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateCheckContext } from '@/components/UpdateCheckProvider';

export function About() {
    const [currentVersion, setCurrentVersion] = useState<string>('0.4.1');
    const [isManualChecking, setIsManualChecking] = useState(false);
    const { checkForUpdates, showUpdateDialog } = useUpdateCheckContext();

    useEffect(() => {
        // Get current version on mount
        getVersion().then(setCurrentVersion).catch(console.error);
    }, []);

    const handleCheckForUpdates = async () => {
        setIsManualChecking(true);
        try {
            const info = await checkForUpdates(true);
            if (info?.available) {
                showUpdateDialog();
            } else {
                toast.success("You're on the latest version");
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
            toast.error('Failed to check for updates. Please try again later.');
        } finally {
            setIsManualChecking(false);
        }
    };

    const openUrl = async (url: string) => {
        try {
            await invoke('open_external_url', { url });
        } catch (error) {
            console.error('Failed to open link:', error);
        }
    };

    return (
        <div className="p-4 space-y-4 h-[80vh] overflow-y-auto">
            {/* Compact Header */}
            <div className="text-center">
                <div className="mb-3">
                    <Image
                        src="/logo-collapsed.png"
                        alt="Scribe"
                        width={72}
                        height={72}
                        priority
                        className="mx-auto rounded-[18px]"
                    />
                </div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">Scribe</h1>
                <span className="text-sm text-muted-foreground"> v{currentVersion}</span>
                <p className="text-medium text-muted-foreground mt-1">
                    Real-time notes and summaries that never leave your machine.
                </p>
                <button
                    type="button"
                    onClick={handleCheckForUpdates}
                    disabled={isManualChecking}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isManualChecking ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {isManualChecking ? 'Checking...' : 'Check for Updates'}
                </button>
            </div>

            {/* Features Grid - Compact */}
            <div className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">What makes Scribe different</h2>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-brand-body/60 rounded-xl p-3 hover:bg-brand-eraser/50 transition-colors">
                        <h3 className="font-bold text-sm text-foreground mb-1">Privacy-first</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Your data & AI processing workflow can now stay within your premise. No cloud, no leaks.</p>
                    </div>
                    <div className="bg-brand-body/60 rounded-xl p-3 hover:bg-brand-eraser/50 transition-colors">
                        <h3 className="font-bold text-sm text-foreground mb-1">Use Any Model</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Prefer local open-source model? Great. Want to plug in an external API? Also fine. No lock-in.</p>
                    </div>
                    <div className="bg-brand-body/60 rounded-xl p-3 hover:bg-brand-eraser/50 transition-colors">
                        <h3 className="font-bold text-sm text-foreground mb-1">Cost-Smart</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Avoid pay-per-minute bills by running models locally (or pay only for the calls you choose).</p>
                    </div>
                    <div className="bg-brand-body/60 rounded-xl p-3 hover:bg-brand-eraser/50 transition-colors">
                        <h3 className="font-bold text-sm text-foreground mb-1">Works everywhere</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">Google Meet, Zoom, Teams-online or offline.</p>
                    </div>
                </div>
            </div>

            {/* Footer - Compact */}
            <div className="pt-2 border-t border-border text-center space-y-1">
                <p className="text-xs text-muted-foreground">
                    Built by Zackriya Solutions
                </p>
                <p className="text-xs text-muted-foreground">
                    Forked from the open-source{' '}
                    <button
                        type="button"
                        onClick={() => openUrl('https://github.com/Zackriya-Solutions/meeting-minutes')}
                        className="underline hover:text-foreground transition-colors"
                    >
                        Meetily
                    </button>{' '}
                    project and repackaged as{' '}
                    <button
                        type="button"
                        onClick={() => openUrl('https://github.com/Bobarinn/scribe')}
                        className="underline hover:text-foreground transition-colors"
                    >
                        Scribe
                    </button>{' '}
                    by{' '}
                    <button
                        type="button"
                        onClick={() => openUrl('https://github.com/Bobarinn/')}
                        className="underline hover:text-foreground transition-colors"
                    >
                        Kolade Abobarin
                    </button>
                    .
                </p>
            </div>
        </div>
    )
}
