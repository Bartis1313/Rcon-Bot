import Levenshtein from 'fast-levenshtein'

class PlayerMatching {
    static getBestPlayerMatch(playerName, players) {
        console.log(playerName)
        console.log(players)
        const matches = []
        const filteredPlayers = players.filter(player => player.toLowerCase().includes(playerName.toLowerCase()));
        const playersBeginning = players.filter(player => player.toLowerCase().startsWith(playerName.toLowerCase()));
        if (playersBeginning.length > 0) {
            for (const player of playersBeginning) {
                matches.push({ distance: Levenshtein.get(playerName, player), playerName: player })
            }
        }
        else {
            for (const player of filteredPlayers) {
                matches.push({ distance: Levenshtein.get(playerName, player), playerName: player })
            }
        }

        matches.sort((n1, n2) => n2 - n1);

        if (matches.length <= 0) return (null); // No matches

        if (playersBeginning.length > 0) { // If the beginning matched
            if (matches.length == 1) { // And there's only one match
                return {
                    type: "good",
                    playerName: matches[0].playerName
                };
            }

            const playerNames = matches
                .slice(0, 10)
                .map((match) => match.playerName);
            return {
                type: "multi",
                playerNames: playerNames
            }; // Multiple matches
        }

        if (matches.length == 1) {
            return {
                type: "good",
                playerName: matches[0].playerName
            };
        }

        if (matches[0].distance <= 3) {
            if (matches[1].distance - matches[0].distance <= 2) { // Multiple matches
                const playerNames = matches
                    .slice(0, 10)
                    .map((match) => match.playerName);
                return {
                    type: "multi",
                    playerNames: playerNames
                }; // Multiple matches
            }

            return (matches[0].playerName);
        }

        if (matches[1].distance - matches[0].distance <= 2) {
            const playerNames = matches
                .slice(0, 10)
                .map((match) => match.playerName);
            return {
                type: "multi",
                playerNames: playerNames
            }; // Multiple matches // Multiple matches
        }

        return {
            type: "far",
            playerName: matches[0].playerName
        }; // Far match
    }
}

export default PlayerMatching