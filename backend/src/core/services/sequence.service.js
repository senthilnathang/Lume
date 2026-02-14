import { Op } from 'sequelize';

export class SequenceService {
    constructor(db) {
        this._db = db;
    }

    async get_next_code(sequence_name, context = {}) {
        const { Sequence } = this._db.models;

        let sequence = await Sequence.findOne({
            where: { name: sequence_name }
        });

        if (!sequence) {
            sequence = await Sequence.create({
                name: sequence_name,
                prefix: '',
                suffix: '',
                padding: 4,
                sequence_next: 1,
                step: 1
            });
        }

        const next_number = sequence.sequence_next;
        const code = this._format_code(sequence, next_number, context);

        await Sequence.update(
            { sequence_next: sequence.sequence_next + sequence.step },
            { where: { id: sequence.id } }
        );

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
        const { Sequence } = this._db.models;
        return await Sequence.create(data);
    }

    async update_sequence(id, data) {
        const { Sequence } = this._db.models;
        await Sequence.update(data, { where: { id } });
        return await Sequence.findByPk(id);
    }

    async get_sequence(name) {
        const { Sequence } = this._db.models;
        return await Sequence.findOne({ where: { name } });
    }

    async reset_sequence(name, start = 1) {
        const { Sequence } = this._db.models;
        await Sequence.update({ sequence_next: start }, { where: { name } });
        return await Sequence.findOne({ where: { name } });
    }
}

export default SequenceService;
