import express from 'express';
import ASTModel from '../models/Rule.js'; // MongoDB Rule model
import cors from 'cors'; // Import CORS middleware
import jsep from 'jsep';

const router = express.Router();

// Allow cross-origin requests
router.use(cors());

// GET all rules
router.get('/', async (req, res) => {
  try {
    const rules = await ASTModel.find(); // Fetch rules from MongoDB
    console.log('Rules agye : ', rules); // Log the rules
    res.json(rules); // Send the rules as a response
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Create a new rule (POST request)
router.post('/create', async (req, res) => {
  const { ruleString } = req.body;

  console.log("Rule String Received:", ruleString); // Debugging rule string received from request

  // Normalize rule string
  const normalizedRuleString = ruleString
    .replace(/\bAND\b/g, '&&')
    .replace(/\bOR\b/g, '||');

  // Create AST from ruleString
  try {
    const ast = await saveASTToDB(normalizedRuleString);
    res.json({ message: 'Rule created', ast });
  } catch (error) {
    console.error('Error saving AST:', error); // Log the error
    res.status(500).json({ message: 'Error creating rule' });
  }
});


// Evaluate a rule (POST request)
router.post('/evaluate', async (req, res) => {
  const { ast, data } = req.body;

  console.log("AST for evaluation:", JSON.stringify(ast, null, 2)); // Debugging AST used for evaluation
  console.log("Data for evaluation:", data); // Debugging input data

  // Evaluate the rule using stack-based logic
  const result = evaluate_rule(ast, data);

  console.log("Final evaluation result:", result); // Debugging final evaluation result

  res.json({ result });
});

// Combine and evaluate multiple rules
async function combineRules(rules, data) {
  let combinedResult = true; // Start with true as we'll AND the results
  for (const rule of rules) {
      const evaluationData = { ast: rule, data };
      const result = evaluate_rule(rule, data); // Use the same evaluate_rule function
      console.log(`Result of rule ${rule._id}:`, result);
      combinedResult = combinedResult && result;
      if (!combinedResult) {
          // If any rule evaluates to false, no need to check further
          break;
      }
  }
  return combinedResult;
}

// Combine rules API endpoint
router.post('/combine', async (req, res) => {
  const { ruleIds, data } = req.body; // Receive rule IDs and input data

  try {
      // Fetch the rules from the database using ruleIds
      const rules = await ASTModel.find({ _id: { $in: ruleIds } });

      // Combine and evaluate the rules
      const combinedResult = await combineRules(rules, data);
      
      res.json({ result: combinedResult });
  } catch (error) {
      res.status(500).json({ message: 'Error combining rules' });
  }
});


// Function to convert parsed expression into custom AST format
function convertToAST(node) {
  if (!node) return null;

  console.log('Converting node to AST:', node); // Debugging node being converted

  if (node.type === 'BinaryExpression') {
      return {
          nodeType: node.operator,
          left: convertToAST(node.left),
          right: convertToAST(node.right)
      };
  } else if (node.type === 'Literal') {
      return { nodeType: 'Literal', value: node.value };
  } else if (node.type === 'Identifier') {
      return { nodeType: 'Identifier', value: node.name };
  } else if (node.type === 'LogicalExpression') {
      return {
          nodeType: node.operator,
          left: convertToAST(node.left),
          right: convertToAST(node.right)
      };
  }
}

// Parse the rule string and generate the AST
function generateASTFromRule(ruleString) {
  const parsedExpression = jsep(ruleString);  // Parse using jsep
  return convertToAST(parsedExpression);
}

async function saveASTToDB(ruleString) {
  // Generate AST from the provided rule string
  const ast = generateASTFromRule(ruleString);
  console.log("Generated AST:", ast); // Log generated AST

  if (!ast) {
    throw new Error('AST generation returned null or undefined');
  }

  // Create an AST document with both the rule string and the AST
  const astDocument = new ASTModel({
      ruleString: ruleString, // Include the original rule string
      ...ast // Spread the rest of the AST properties
  });

  // Save the document to MongoDB
  await astDocument.save();
  console.log('AST saved to MongoDB:', astDocument);
  return astDocument;
}

function evaluate_rule(ast, data) {
  if (!ast) return false; // If no AST provided, return false

  console.log('Evaluating:', ast);

  switch (ast.nodeType) {
      case '&&':
          return evaluate_rule(ast.left, data) && evaluate_rule(ast.right, data);
      case '||':
          return evaluate_rule(ast.left, data) || evaluate_rule(ast.right, data);
      case '>':
          const greaterThanResult = data[ast.left.value] > ast.right.value;
          console.log(`${data[ast.left.value]} > ${ast.right.value}: ${greaterThanResult}`);
          return greaterThanResult;
      case '<':
          const lessThanResult = data[ast.left.value] < ast.right.value;
          console.log(`${data[ast.left.value]} < ${ast.right.value}: ${lessThanResult}`);
          return lessThanResult;
      case '==':
          const equalityResult = data[ast.left.value] === ast.right.value;
          console.log(`${data[ast.left.value]} == ${ast.right.value}: ${equalityResult}`);
          return equalityResult;
      default:
          return false; 
  }
}



export default router;  
