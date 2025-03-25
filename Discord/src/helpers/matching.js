import Fuse from 'fuse.js';

class Matching {
    static getBestMatch(matchName, arrNames, numLimit = 10) {
        // Early return if array is empty
        if (arrNames.length === 0) return null;

        // First check for exact matches - fastest path
        const exactMatch = arrNames.find(name => name.toLowerCase() === matchName.toLowerCase());
        if (exactMatch) {
            return {
                type: "good",
                name: exactMatch
            };
        }

        const options = {
            includeScore: true,
            threshold: 0.35,        // Lower = more strict matching
            location: 0,           // Where to start searching in the string
            distance: 100,         // How far to search through the string
            //minMatchCharLength: Math.max(2, matchName.length - 1), // Account for small misspellings
            ignoreLocation: true,  // Search anywhere in the string
            keys: ["name"]
        };

        const nameObjects = arrNames.map(name => ({ name }));
        const fuse = new Fuse(nameObjects, options);
        const results = fuse.search(matchName);

        if (results.length === 0) {
            return {
                type: "far",
                name: arrNames[0]
            };
        }
        
        const fuseMatches = results.map(result => ({
            distance: Math.round(result.score * 10),
            name: result.item.name
        }));
        
        if (fuseMatches.length === 1) {
            return {
                type: "good",
                name: fuseMatches[0].name
            };
        }
        
        if (fuseMatches[0].distance <= 3) {
            if (fuseMatches[1].distance - fuseMatches[0].distance <= 2) {
                return {
                    type: "multi",
                    names: fuseMatches.slice(0, numLimit).map(m => m.name)
                };
            }
            return {
                type: "good",
                name: fuseMatches[0].name
            };
        }
        
        if (fuseMatches[1].distance - fuseMatches[0].distance <= 2) {
            return {
                type: "multi",
                names: fuseMatches.slice(0, numLimit).map(m => m.name)
            };
        }
        
        return {
            type: "far",
            name: fuseMatches[0].name
        };
    }
}

export default Matching;