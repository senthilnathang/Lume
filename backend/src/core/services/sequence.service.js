import prisma from '../db/prisma.js';

export class SequenceService {
    async get_next_code(sequence_name, context = {}) {
        let sequence = await prisma.sequence.findFirst({
            where: { name: sequence_name }
        });

        if (!sequence) {
            sequence = await prisma.sequence.create({
                data: {
                    name: sequence_name,
                    prefix: '',
                    suffix: '',
                    padding: 4,
                    sequenceNext: 1,
                    step: 1
                }
            });
        }

        const next_number = sequence.sequenceNext;
        const code = this._format_code(sequence, next_number, context);

        await prisma.sequence.update({
            where: { id: sequence.id },
            data: { sequenceNext: sequence.sequenceNext + sequence.step }
        });

        return code;
    }

    _format_code(sequence, number, context = {}) {
        const { prefix = '', suffix = '', padding = 4 } = sequence;
        const date = new Date();
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');

        let formatted = prefix
            .replace('{year}', year)
            .replace('{month}', month)
            .replace('{day}', day)
            .replace('{company}', context.company_code || '');

        formatted += number.toString().padStart(padding, '0');

        formatted += suffix
            .replace('{year}', year)
            .replace('{month}', month)
            .replace('{day}', day);

        return formatted;
    }

    async create_sequence(data) {
        return await prisma.sequence.create({ data });
    }

    async update_sequence(id, data) {
        return await prisma.sequence.update({
            where: { id },
            data
        });
    }

    async get_sequence(name) {
        return await prisma.sequence.findFirst({ where: { name } });
    }

    async reset_sequence(name, start = 1) {
        await prisma.sequence.updateMany({
            where: { name },
            data: { sequenceNext: start }
        });
        return await prisma.sequence.findFirst({ where: { name } });
    }
}

export default SequenceService;
