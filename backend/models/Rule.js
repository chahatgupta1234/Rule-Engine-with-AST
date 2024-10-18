import mongoose from 'mongoose';

// Define an AST schema for MongoDB
const astSchema = new mongoose.Schema({
  ruleString: String,
  nodeType: String,
  left: Object,
  right: Object,
  value: String
}, { collection: 'ast' });

const ASTModel = mongoose.model('AST', astSchema);
export default ASTModel;
