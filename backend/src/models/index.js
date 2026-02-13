import { sequelize } from '../config/database.js';
import { Organization } from './Organization.js';
import { TeamMember } from './TeamMember.js';
import { Programme } from './Programme.js';
import { Activity } from './Activity.js';
import { Document } from './Document.js';
import { ContactMessage } from './ContactMessage.js';
import { Donor } from './Donor.js';
import { Donation } from './Donation.js';
import { User } from './User.js';

Organization.hasMany(TeamMember, { foreignKey: 'organization_id', as: 'teamMembers' });
TeamMember.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Programme.hasMany(Activity, { foreignKey: 'programme_id', as: 'activities' });
Activity.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });

Programme.hasMany(Document, { foreignKey: 'programme_id', as: 'documents' });
Document.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });

Donor.hasMany(Donation, { foreignKey: 'donor_id', as: 'donations' });
Donation.belongsTo(Donor, { foreignKey: 'donor_id', as: 'donor' });

Programme.hasMany(Donation, { foreignKey: 'programme_id', as: 'donations' });
Donation.belongsTo(Programme, { foreignKey: 'programme_id', as: 'programme' });

User.hasMany(ContactMessage, { foreignKey: 'replied_by', as: 'replies' });
ContactMessage.belongsTo(User, { foreignKey: 'replied_by', as: 'replier' });

export {
  sequelize,
  Organization,
  TeamMember,
  Programme,
  Activity,
  Document,
  ContactMessage,
  Donor,
  Donation,
  User
};
