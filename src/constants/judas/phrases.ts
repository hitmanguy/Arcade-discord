// System lies to create uncertainty and paranoia
export const SYSTEM_LIES = [
    "System Alert: {player} has lied.",
    "Suspicion detected: {player} shows stress response.",
    "AI recommends isolating {player}.",
    "System Alert: {player} is hiding information.",
    "Warning: {player} attempted to access restricted data.",
    "System Alert: {player} is not who they claim to be.",
    "Suspicion: {player} is acting erratically.",
    "Warning: {player} displays deceptive behavior patterns.",
    "System Alert: {player} attempting to manipulate others.",
    "Anomaly detected in {player}'s story."
];

// Phase messages
export const PHASE_MESSAGES = {
    phase1: {
        start: "Phase 1: Information Exchange\nShare what you know, but be careful who you trust...",
        end: "Phase 1 complete. Trust has been tested..."
    },
    phase2: {
        start: "Phase 2: Accusations\nTime to voice your suspicions. Who is the traitor among you?",
        end: "Phase 2 complete. The truth begins to emerge..."
    },
    phase3: {
        start: "Final Phase: Judgment\nOne last chance to identify the Judas. Choose wisely.",
        end: "The Judas Protocol has concluded."
    }
};

// Victory messages
export const VICTORY_MESSAGES = {
    innocentsWin: {
        title: "🌟 The Judas Has Been Eliminated!",
        description: "The loyal prisoners have successfully identified and eliminated the traitor. Trust and vigilance have prevailed."
    },
    judasWins: {
        title: "🎭 The Judas Emerges Victorious!",
        description: "The Judas has successfully manipulated their way to victory. Trust was misplaced, and deception reigns."
    }
};

// System notifications
export const NOTIFICATIONS = {
    playerEliminated: "{player} has been eliminated from the protocol.",
    timeWarning: "⚠️ 30 seconds remaining in this phase...",
    phaseChange: "Protocol entering next phase...",
    tieVote: "No clear majority reached. All suspects remain...",
    dmError: "Warning: Unable to send secret to {player}. They may have DMs disabled.",
    invalidVote: "Invalid vote: Target is no longer in the protocol.",
    alreadyVoted: "You have already cast your vote this phase."
};

// Game status messages
export const STATUS_MESSAGES = {
    waitingForPlayers: "Waiting for more players to join...",
    readyToStart: "Minimum players reached. Ready to begin.",
    gameInProgress: "Protocol currently in progress.",
    gameEnded: "Protocol has concluded."
};