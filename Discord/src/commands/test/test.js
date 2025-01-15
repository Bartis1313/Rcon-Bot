module.exports = class Test {
    constructor() {
        this.name = 'test';
        this.alias = ['t'];
        this.usage = '?test';
    }

    async run(bot, message, args) {
        const reply = await message.reply(`${this.name} worked!`);
        await message.delete();
        return reply;
    }
};
