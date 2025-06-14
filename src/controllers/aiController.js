const Project = require('../models/Project');
const StudyPlan = require('../models/StudyPlan');
const Flashcard = require('../models/Flashcard');
const QA = require('../models/QA');
const Roadmap = require('../models/Roadmap');
const Slide = require('../models/Slide');
const { generateContent } = require('../services/aiService');
const { generateStudyPlan } = require('../services/studyPlanService');
const pdf = require('pdf-parse');
const fs = require('fs');
const { generateFlashcards } = require('../services/flashcardService');
const { generateQA } = require('../services/qaService');
const { generateSlides } = require('../services/slidesService');
const Summary = require('../models/Summary');

// @desc    Create a new study project
// @route   POST /api/ai/projects
// @access  Private
exports.createProject = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user.id; // User ID from authenticated request

    if (!title) {
      return res.status(400).json({ message: 'Project title is required.' });
    }

    const newProject = await Project.create({
      user: userId,
      title,
      description,
    });

    res.status(201).json(newProject);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: 'Failed to create project.' });
  }
};

// @desc    Get a single study project by ID
// @route   GET /api/ai/projects/:projectId
// @access  Private
exports.getProjectById = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;

    const project = await Project.findOne({ _id: projectId, user: userId });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or not owned by user.' });
    }

    // Get counts of associated AI content
    const flashcardsCount = await Flashcard.countDocuments({ project: projectId, user: userId });
    const qaPairsCount = await QA.countDocuments({ project: projectId, user: userId });

    res.status(200).json({
      ...project.toObject(),
      flashcardsCount,
      qaPairsCount,
    });
  } catch (error) {
    console.error("Error getting project by ID:", error);
    res.status(500).json({ message: 'Failed to retrieve project.' });
  }
};

// @desc    Update a study project
// @route   PUT /api/ai/projects/:projectId
// @access  Private
exports.updateProject = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const { title, description } = req.body;

    const project = await Project.findOne({ _id: projectId, user: userId });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or not owned by user.' });
    }

    if (!title) {
      return res.status(400).json({ message: 'Project title is required.' });
    }

    project.title = title;
    project.description = description || project.description; // Allow description to be optional
    await project.save();

    res.status(200).json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: 'Failed to update project.' });
  }
};

// @desc    Get Study Plan for a project
// @route   GET /api/ai/projects/:projectId/study-plan
// @access  Private
exports.getStudyPlanByProjectId = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const studyPlan = await StudyPlan.findOne({ project: projectId, user: userId });
    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found for this project.' });
    }
    res.status(200).json(studyPlan);
  } catch (error) {
    console.error("Error fetching study plan:", error);
    res.status(500).json({ message: 'Failed to retrieve study plan.' });
  }
};

// @desc    Get Flashcards for a project
// @route   GET /api/ai/projects/:projectId/flashcards
// @access  Private
exports.getFlashcardsByProjectId = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const flashcards = await Flashcard.findOne({ project: projectId, user: userId });
    if (!flashcards) {
      return res.status(404).json({ message: 'Flashcards not found for this project.' });
    }
    res.status(200).json(flashcards);
  } catch (error) {
    console.error("Error fetching flashcards:", error);
    res.status(500).json({ message: 'Failed to retrieve flashcards.' });
  }
};

// @desc    Get Q&A for a project
// @route   GET /api/ai/projects/:projectId/qa
// @access  Private
exports.getQAByProjectId = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const qa = await QA.findOne({ project: projectId, user: userId });
    if (!qa) {
      return res.status(404).json({ message: 'Q&A not found for this project.' });
    }
    res.status(200).json(qa);
  } catch (error) {
    console.error("Error fetching Q&A:", error);
    res.status(500).json({ message: 'Failed to retrieve Q&A.' });
  }
};

// @desc    Get Roadmap for a project
// @route   GET /api/ai/projects/:projectId/roadmap
// @access  Private
exports.getRoadmapByProjectId = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const roadmap = await Roadmap.findOne({ project: projectId, user: userId });
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found for this project.' });
    }
    res.status(200).json(roadmap);
  } catch (error) {
    console.error("Error fetching roadmap:", error);
    res.status(500).json({ message: 'Failed to retrieve roadmap.' });
  }
};

// @desc    Get Slides for a project
// @route   GET /api/ai/projects/:projectId/slides
// @access  Private
exports.getSlidesByProjectId = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const slides = await Slide.findOne({ project: projectId, user: userId });
    if (!slides) {
      return res.status(404).json({ message: 'Slides not found for this project.' });
    }
    res.status(200).json(slides);
  } catch (error) {
    console.error("Error fetching slides:", error);
    res.status(500).json({ message: 'Failed to retrieve slides.' });
  }
};

// Utility function to extract text from PDF buffer
const extractTextFromPdf = async (filePath) => {
  try {
    console.log(`Attempting to extract text from file: ${filePath}`);
    const dataBuffer = fs.readFileSync(filePath); // Read file into a buffer synchronously
    console.log(`Buffer type: ${dataBuffer.constructor.name}, length: ${dataBuffer.length}`);
    const data = await pdf(dataBuffer); // Pass the buffer to pdf-parse
    return data.text;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to extract text from PDF.");
  }
};

// @desc    Upload PDF and extract text for a project
// @route   POST /api/ai/upload/:projectId
// @access  Private
exports.uploadPdf = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id; // User ID from authenticated request

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const project = await Project.findOne({ _id: projectId, user: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or not owned by user.' });
    }

    const pdfText = await extractTextFromPdf(req.file.path);

    // Save file metadata and path to project, and append extracted text
    project.uploadedFiles.push({
      fileName: req.file.originalname,
      filePath: req.file.filename, // Store the actual filename generated by multer
      uploadDate: new Date() // Add the upload date
    });
    project.extractedTextContent += `\n\n--- Content from ${req.file.originalname} ---\n${pdfText}`;
    await project.save();

    res.status(200).json({
      message: 'File uploaded and text extracted successfully.',
      projectId: project._id,
      fileName: req.file.originalname,
      filePath: req.file.filename,
      uploadDate: new Date(), // Send the upload date in the response
      extractedTextContent: project.extractedTextContent
    });
  } catch (error) {
    console.error("Error in uploadPdf:", error);
    res.status(500).json({ message: error.message });
  }
};

// Generic function to generate and save AI content
const generateAndSaveContent = async (req, res, ContentModel, promptPrefix, successMessage, parseJson = false) => {
  try {
    const { projectId, contentInput, projectName } = req.body; // Added projectName
    const userId = req.user.id;

    const project = await Project.findOne({ _id: projectId, user: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or not owned by user.' });
    }

    if (!contentInput) {
      return res.status(400).json({ message: 'Content input is required for AI generation.' });
    }

    const prompt = `You are an expert study assistant. Based on the project titled "${projectName}" and the following study material, generate content as specified. Crucially, your response MUST only contain the requested content and NOTHING else. Do NOT include any conversational filler, explanations, or XML tags like <think>.\n\n${promptPrefix}\n\nHere is the study material: ${contentInput}`;

    const aiResponseRaw = await generateContent(prompt);

    let aiResponse;
    if (parseJson) {
      try {
        aiResponse = JSON.parse(aiResponseRaw);
      } catch (jsonError) {
        console.error("Failed to parse AI response as JSON:", jsonError);
        console.error("Raw AI response:", aiResponseRaw);
        return res.status(500).json({ message: 'AI generated content in an unexpected format.', rawResponse: aiResponseRaw });
      }
    } else {
      aiResponse = aiResponseRaw;
    }

    const newContent = await ContentModel.create({
      project: projectId,
      user: userId,
      content: aiResponse, 
    });

    res.status(201).json({ message: successMessage, data: newContent });
  } catch (error) {
    console.error(`Error in ${successMessage.toLowerCase()}:`, error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate Study Plan for a project
// @route   POST /api/ai/generate/study-plan
// @access  Private
exports.generateStudyPlan = async (req, res) => {
  try {
    const { projectId, contentInput, projectName, projectDescription } = req.body;
    const userId = req.user.id;

    const project = await Project.findOne({ _id: projectId, user: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or not owned by user.' });
    }

    if (!contentInput) {
      return res.status(400).json({ message: 'Content input is required for AI generation.' });
    }

    const studyPlan = await generateStudyPlan(projectId, userId, contentInput, projectName, projectDescription);

    res.status(201).json({
      message: "Study plan generated successfully.",
      data: studyPlan
    });

  } catch (error) {
    console.error("Error generating study plan:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate Flashcards for a project
// @route   POST /api/ai/generate/flashcards
// @access  Private
exports.generateFlashcards = async (req, res) => {
  try {
    const { projectId, contentInput, projectName } = req.body;
    const userId = req.user.id;

    const project = await Project.findOne({ _id: projectId, user: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or not owned by user.' });
    }

    if (!contentInput) {
      return res.status(400).json({ message: 'Content input is required for AI generation.' });
    }

    const flashcards = await generateFlashcards(projectId, userId, contentInput, projectName);

    res.status(201).json({
      message: "Flashcards generated successfully.",
      data: flashcards
    });

  } catch (error) {
    console.error("Error generating flashcards:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate Q&A for a project
// @route   POST /api/ai/generate/qa
// @access  Private
exports.generateQA = async (req, res) => {
  try {
    const { projectId, contentInput, projectName } = req.body;
    const userId = req.user.id;

    const project = await Project.findOne({ _id: projectId, user: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or not owned by user.' });
    }

    if (!contentInput) {
      return res.status(400).json({ message: 'Content input is required for AI generation.' });
    }

    const qa = await generateQA(projectId, userId, contentInput, projectName);

    res.status(201).json({
      message: "Q&A generated successfully.",
      data: qa
    });

  } catch (error) {
    console.error("Error generating Q&A:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate Roadmap for a project
// @route   POST /api/ai/generate/roadmap
// @access  Private
exports.generateRoadmap = (req, res) => {
  generateAndSaveContent(req, res, Roadmap, 
    `Generate a learning roadmap in JSON format. The JSON should be an array of objects, where each object has 'milestone' (string), 'description' (string), and 'eta' (string, estimated time of arrival/completion).`, 
    "Roadmap generated successfully.", true);
};

// @desc    Generate Slides for a project
// @route   POST /api/ai/generate/slides
// @access  Private
exports.generateSlides = async (req, res) => {
  try {
    const { projectId, contentInput, projectName } = req.body;
    const userId = req.user.id;

    if (!contentInput) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const project = await Project.findOne({ _id: projectId, user: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const slides = await generateSlides(projectId, userId, contentInput, projectName || project.name);
    res.json({ data: slides });
  } catch (error) {
    console.error('Error in generateSlides:', error);
    res.status(500).json({ message: error.message || 'Error generating slides' });
  }
};

// @desc    Update status of a specific study plan item
// @route   PUT /api/ai/study-plans/:studyPlanId/items/:itemIndex/status
// @access  Private
exports.updateStudyPlanItemStatus = async (req, res) => {
  try {
    const { studyPlanId, itemIndex } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const studyPlan = await StudyPlan.findOne({ _id: studyPlanId, user: userId });

    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found or not owned by user.' });
    }

    if (!studyPlan.content || itemIndex < 0 || itemIndex >= studyPlan.content.length) {
      return res.status(400).json({ message: 'Invalid study plan item index.' });
    }

    if (!['completed', 'current', 'upcoming'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided.' });
    }

    studyPlan.content[itemIndex].status = status;
    await studyPlan.save();

    res.status(200).json({ message: 'Study plan item status updated successfully.', studyPlan: studyPlan });
  } catch (error) {
    console.error("Error updating study plan item status:", error);
    res.status(500).json({ message: 'Failed to update study plan item status.' });
  }
};

// @desc    Get all study projects for the authenticated user
// @route   GET /api/ai/projects
// @access  Private
exports.getAllProjects = async (req, res) => {
  try {
    const userId = req.user.id; // User ID from authenticated request
    const projects = await Project.find({ user: userId });
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching all projects:", error);
    res.status(500).json({ message: 'Failed to retrieve projects.' });
  }
};

// @desc    Delete a study project
// @route   DELETE /api/ai/projects/:projectId
// @access  Private
exports.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;

    const project = await Project.findOne({ _id: projectId, user: userId });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or not owned by user.' });
    }

    // Delete associated AI content
    await Promise.all([
      StudyPlan.deleteMany({ project: projectId }),
      Flashcard.deleteMany({ project: projectId }),
      QA.deleteMany({ project: projectId }),
      Roadmap.deleteMany({ project: projectId }),
      Slide.deleteMany({ project: projectId })
    ]);

    // Delete the project
    await Project.deleteOne({ _id: projectId });

    res.status(200).json({ message: 'Project and associated content deleted successfully.' });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: 'Failed to delete project.' });
  }
};

// @desc    Update project progress based on study plan completion
// @route   PUT /api/ai/projects/:projectId/progress
// @access  Private
exports.updateProjectProgress = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;

    const project = await Project.findOne({ _id: projectId, user: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or not owned by user.' });
    }

    // Get the study plan for this project
    const studyPlan = await StudyPlan.findOne({ project: projectId, user: userId });
    if (!studyPlan) {
      return res.status(404).json({ message: 'Study plan not found for this project.' });
    }

    // Calculate progress based on completed items
    const totalItems = studyPlan.content.length;
    const completedItems = studyPlan.content.filter(item => item.status === 'completed').length;
    const studyPlanProgress = Math.round((completedItems / totalItems) * 100);

    // Update project progress
    project.progress.studyPlan = studyPlanProgress;
    
    // Calculate overall progress (average of all progress metrics)
    const progressMetrics = [
      project.progress.studyPlan,
      project.progress.flashcards,
      project.progress.qa,
      project.progress.slides
    ];
    project.progress.overall = Math.round(progressMetrics.reduce((a, b) => a + b, 0) / progressMetrics.length);

    // Update project status based on overall progress
    if (project.progress.overall === 100) {
      project.status = 'completed';
    } else if (project.progress.overall > 0) {
      project.status = 'in_progress';
    }

    await project.save();

    res.status(200).json({
      message: 'Project progress updated successfully.',
      project: project
    });
  } catch (error) {
    console.error("Error updating project progress:", error);
    res.status(500).json({ message: 'Failed to update project progress.' });
  }
};

// @desc    Generate Summary for a project
// @route   POST /api/ai/generate/summary
// @access  Private
exports.generateSummary = async (req, res) => {
  try {
    const { projectId, contentInput, projectName } = req.body;
    const userId = req.user.id;

    const project = await Project.findOne({ _id: projectId, user: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or not owned by user.' });
    }

    if (!contentInput) {
      return res.status(400).json({ message: 'Content input is required for AI generation.' });
    }

    const prompt = `You are an expert study assistant. Create a comprehensive summary of the following project and content.

Project Name: ${projectName}

Study Material Content:
${contentInput}

Your task is to create a detailed summary that:
1. Captures the main ideas and key concepts
2. Organizes information in a logical structure
3. Highlights important details and relationships
4. Uses clear and concise language
5. Maintains accuracy and completeness
6. Includes relevant examples where appropriate
7. Provides context for technical terms
8. Summarizes complex ideas effectively
9. Provides in detail, not just one line

IMPORTANT: Format your response in HTML with the following structure:
- Use <h1> for main topics
- Use <h2> for subtopics
- Use <h3> for specific concepts
- Use <p> for detailed explanations
- Use <ul> and <li> for lists
- Use <strong> for important terms
- Use <em> for emphasis
- Use <div class="example"> for examples
- Use <div class="note"> for important notes

CRITICAL INSTRUCTIONS:
1. DO NOT return JSON format
2. DO NOT use any JSON structure or keys
3. DO NOT include any parentheses or brackets
4. DO NOT include any metadata or additional text
5. ONLY return the HTML content directly
6. Start with <h1> and end with the last HTML tag
7. Make sure all content is properly wrapped in HTML tags
8. Ensure proper nesting of HTML elements
9. Include proper spacing between sections
10. Use semantic HTML structure

Example of correct format:
<h1>Introduction to Machine Learning</h1>
<p>Machine learning is a field of study that gives computers the ability to learn without being explicitly programmed. It involves programming computers to optimize a performance criterion using example data or past experience.</p>

<h2>Definition</h2>
<p>A computer program is said to learn from experience E with respect to some class of tasks T and performance measure P, if its performance at tasks T, as measured by P, improves with experience E.</p>

<h2>Applications</h2>
<ul>
  <li>Retail business: Studying consumer behavior</li>
  <li>Finance: Analyzing past data for credit applications</li>
  <li>Manufacturing: Optimization and control</li>
</ul>

<div class="example">
  <h3>Real-world Example</h3>
  <p>In healthcare, machine learning algorithms analyze patient data to predict disease risks and recommend personalized treatment plans.</p>
</div>

Do not include any additional text or explanations outside the HTML structure.`;

    const aiResponse = await generateContent(prompt);

    const newSummary = await Summary.create({
      project: projectId,
      user: userId,
      content: aiResponse,
    });

    res.status(201).json({
      message: "Summary generated successfully.",
      data: newSummary
    });

  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({ message: error.message });
  }
}; 


// @desc    Get summary for a project
// @route   GET /api/ai/summary/:projectId
// @access  Private
exports.getSummary = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;

    const summary = await Summary.findOne({ project: projectId, user: userId });

    if (!summary) {
      return res.status(404).json({ message: 'Summary not found for this project.' });
    }

    res.status(200).json({
      message: "Summary retrieved successfully.",
      data: summary
    });
  } catch (error) {
    console.error("Error retrieving summary:", error);
    res.status(500).json({ message: error.message });
  }
};
