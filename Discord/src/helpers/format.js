const format = (inputArray) => {
    // parse array info in struct like
    let arr = [];
    for (let i = 0; i < inputArray.length; i += 4) {
        const score = parseInt(inputArray[i], 10);
        const stat1 = parseInt(inputArray[i + 1], 10);
        const stat2 = parseInt(inputArray[i + 2], 10);
        const name = inputArray[i + 3];
        arr.push([score, stat1, stat2, name]);
    }

    // sort by scores, (scores are first)
    arr.sort((a, b) => b[0] - a[0]);

    // max spaces between each split
    let maxLength1 = 0, maxLength2 = 0, maxLength3 = 0;

    arr.forEach(w => {
        if (String(w[0]).length > maxLength1) maxLength1 = String(w[0]).length;
        if (String(w[1]).length > maxLength2) maxLength2 = String(w[1]).length;
        if (String(w[2]).length > maxLength3) maxLength3 = String(w[2]).length;
    });

    // formatting is done here
    arr = arr.map(w => {
        return [
            String(w[0]).padEnd(maxLength1 + 1, " "),
            String(w[1]).padEnd(maxLength2 + 1, " "),
            String(w[2]).padEnd(maxLength3 + 1, " "),
            `"${w[3]}"\n`
        ].join("");
    });

    return arr.join("");
};

export default format