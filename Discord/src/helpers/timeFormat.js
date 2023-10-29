const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    let formattedDuration = '';

    if (hours > 0) {
        formattedDuration += hours.toString().padStart(2, '0') + ':';
    }

    formattedDuration += minutes.toString().padStart(2, '0') + ':' + remainingSeconds.toString().padStart(2, '0');

    return formattedDuration;
}

export default formatDuration