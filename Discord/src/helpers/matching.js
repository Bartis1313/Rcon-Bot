import Levenshtein from 'fast-levenshtein';

class Matching {
    static getBestMatch(matchName, arrNames, numLimit = 10) {
        // no sense to match...
        if (arrNames.length === 0)
            return null;

        const matches = [];
        const filteredNames = arrNames.filter(n => n.toLowerCase().includes(matchName.toLowerCase()));
        const namesBeginning = arrNames.filter(n => n.toLowerCase().startsWith(matchName.toLowerCase()));

        if (namesBeginning.length > 0) {
            for (const name of namesBeginning) {
                matches.push({ distance: Levenshtein.get(matchName, name), name: name });
            }
        } else {
            for (const name of filteredNames) {
                matches.push({ distance: Levenshtein.get(matchName, name), name: name });
            }
        }

        matches.sort((n1, n2) => n1.distance - n2.distance); // sort by dist

        if (matches.length <= 0) return null; // nothing to match

        if (namesBeginning.length > 0) { // if the beginning matched
            if (matches.length === 1) { // and there's only one match
                return {
                    type: "good",
                    name: matches[0].name
                };
            }

            const matchedNames = matches
                .slice(0, numLimit)
                .map((match) => match.name);
            return {
                type: "multi",
                names: matchedNames
            }; // multiple matches
        }

        if (matches.length === 1) {
            return {
                type: "good",
                name: matches[0].name
            };
        }

        if (matches[0].distance <= 3) {
            if (matches[1].distance - matches[0].distance <= 2) {
                const matchedNames = matches
                    .slice(0, numLimit)
                    .map((match) => match.name);
                return {
                    type: "multi",
                    names: matchedNames
                }; // multiple matches
            }

            // it's pretty close match, return as correct then
            return {
                type: "good",
                name: matches[0].name
            };
        }

        if (matches[1].distance - matches[0].distance <= 2) {
            const matchedNames = matches
                .slice(0, numLimit)
                .map((match) => match.name);
            return {
                type: "multi",
                names: matchedNames
            }; // multiple matches
        }

        return {
            type: "far",
            name: matches[0].name
        }; // far match, better redo this match...
    }
}

export default Matching;