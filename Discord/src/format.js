function format(str) {
    let arr = [];

    // Divides array into chunks of 4

    for (let x = 0; x < str.length; x += 4) {
        arr.push([str[x], str[x + 1], str[x + 2], str[x + 3]])
    }

    let maxLength1 = 0;
    let maxLength2 = 0;
    let maxLength3 = 0;

    // Gets Max Length of Elements at index 0 and 1 of each array

    arr.forEach(w => {
        w[0].length > maxLength1 ? maxLength1 = w[0].length : null;
        w[1].length > maxLength2 ? maxLength2 = w[1].length : null;
        w[2].length > maxLength3 ? maxLength3 = w[2].length : null;
    })

    // adds spaces to end of string depending on its length

    arr = arr.map(w => [w[0] + (" ").repeat(maxLength1 - w[0].length + 1), w[1] + (" ").repeat(maxLength2 - w[1].length + 1), w[2] + (" ").repeat(maxLength3 - w[2].length + 1) + '"' + w[3] + '"' + "\n"]);

    return (arr.flat().join(""))
}

export default format