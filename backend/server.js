import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { InferenceClient } from "@huggingface/inference";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5000;

/* =========================================
   HUGGING FACE CONFIGURATION
========================================= */

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL = "openai/gpt-oss-120b";

if (!HF_TOKEN) {
  console.error("ERROR: HF_TOKEN is missing from backend/.env");
}

const hf = new InferenceClient(HF_TOKEN);


/* =========================================
   CIVICFLOW RESPONSE SCHEMA
========================================= */

const responseSchema = {
  type: "object",
  additionalProperties: false,

  properties: {

    input_type: {
      type: "string",
      enum: [
        "citizen_grievance",
        "government_order"
      ]
    },

    summary: {
      type: "string"
    },

    overall_priority: {
      type: "string",
      enum: [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
      ]
    },

    issues: {
      type: "array",

      items: {
        type: "object",
        additionalProperties: false,

        properties: {

          title: {
            type: "string"
          },

          department: {
            type: "string"
          },

          action: {
            type: "string"
          },

          priority: {
            type: "string",
            enum: [
              "LOW",
              "MEDIUM",
              "HIGH",
              "CRITICAL"
            ]
          },

          deadline: {
            type: [
              "string",
              "null"
            ]
          },

          location: {
            type: [
              "string",
              "null"
            ]
          },

          authority: {
            type: [
              "string",
              "null"
            ]
          }

        },

        required: [
          "title",
          "department",
          "action",
          "priority",
          "deadline",
          "location",
          "authority"
        ]
      }
    }
  },

  required: [
    "input_type",
    "summary",
    "overall_priority",
    "issues"
  ]
};


/* =========================================
   HOME / SERVER TEST
========================================= */

app.get("/", (req, res) => {

  res.json({

    message: "CivicFlow AI backend is running",

    ai: "Hugging Face Inference Providers",

    model: MODEL,

    status: HF_TOKEN
      ? "Configured"
      : "Missing HF_TOKEN"

  });

});


/* =========================================
   AI ANALYSIS
========================================= */

app.post("/api/analyze", async (req, res) => {

  try {

    const {
      complaint,
      inputType = "grievance"
    } = req.body;


    /* =========================================
       VALIDATION
    ========================================= */

    if (
      !complaint ||
      complaint.trim().length < 5
    ) {

      return res.status(400).json({

        error:
          "Please provide valid text for analysis."

      });

    }


    if (!HF_TOKEN) {

      return res.status(500).json({

        error:
          "Hugging Face token is not configured.",

        details:
          "Add HF_TOKEN to backend/.env"

      });

    }


    /* =========================================
       INPUT TYPE INSTRUCTION
    ========================================= */

    let typeInstruction = "";


    if (
      inputType === "government_order"
    ) {

      typeInstruction = `

The input is a GOVERNMENT ORDER or
DISTRICT COLLECTOR ORDER.

Analyze it as an official administrative
directive.

Identify EVERY separate directive or task.

For every directive identify:

- Responsible department
- Required action
- Explicit deadline or completion period
- Priority
- Location if mentioned
- Officer or authority if mentioned

Do not combine separate directives.

`;

    }

    else {

      typeInstruction = `

The input is a CITIZEN GRIEVANCE.

Identify EVERY separate civic problem.

A single complaint can contain multiple
unrelated problems.

For example:

1. Road is damaged.
2. Garbage has not been collected.
3. Street lights are not working.

These MUST become THREE separate issues.

Do NOT assign the entire complaint
to one department.

`;

    }


    /* =========================================
       CIVICFLOW SYSTEM INSTRUCTION
    ========================================= */

    const systemInstruction = `

You are CivicFlow AI, a government civic
intelligence and department-routing assistant.

Your job is to analyze citizen grievances
and government orders and produce a structured
routing plan.

${typeInstruction}

IMPORTANT RULES:

1. Identify EVERY separate issue or directive.

2. Never combine unrelated problems.

3. Assign the most appropriate government
department.

4. Extract the required action.

5. Extract deadlines ONLY if explicitly stated
in the input.

6. If a deadline is not provided, return null.

7. Determine priority based on urgency and
public impact.

8. NEVER invent facts.

9. Keep issue titles short and professional.

10. Use clear administrative language.

11. If location is not mentioned, return null.

12. If authority/officer is not mentioned,
return null.

13. Return ONLY valid JSON matching the
required schema.

14. Do not use markdown.

15. Do not add text outside the JSON.


Possible departments:

- Roads & Highways
- Sanitation
- Electricity
- Water Supply
- Public Health
- Police
- Revenue
- Municipal Administration
- Transport
- Education
- Rural Development
- Urban Development
- Disaster Management
- Public Works Department
- Environment
- Social Welfare
- Other Relevant Department


Priority rules:

LOW:
Minor issue with limited immediate
public impact.

MEDIUM:
Normal civic issue requiring attention
without immediate danger.

HIGH:
Important issue affecting many people
or requiring prompt intervention.

CRITICAL:
Immediate threat to life, major public
safety risk, major disaster, serious
emergency, or extremely urgent government
directive.

`;


    /* =========================================
       USER PROMPT
    ========================================= */

    const userPrompt = `

INPUT TYPE:

${
  inputType === "government_order"
    ? "Government Order / District Collector Order"
    : "Citizen Grievance"
}


TEXT:

${complaint}


Analyze the input and return the CivicFlow
department routing plan as JSON only.

`;


    /* =========================================
       LOGGING
    ========================================= */

    console.log("");

    console.log(
      "================================"
    );

    console.log(
      "CIVICFLOW AI ANALYSIS"
    );

    console.log(
      "================================"
    );

    console.log(
      "Input Type:",
      inputType
    );

    console.log(
      "AI Provider: Hugging Face"
    );

    console.log(
      "Model:",
      MODEL
    );

    console.log(
      "Sending request..."
    );

    console.log("");


    /* =========================================
       HUGGING FACE REQUEST
    ========================================= */

    const hfResponse =
      await hf.chatCompletion({

        model: MODEL,

        provider: "auto",

        messages: [

          {
            role: "system",
            content: systemInstruction
          },

          {
            role: "user",
            content: userPrompt
          }

        ],

        temperature: 0,

        response_format: {

          type: "json_schema",

          json_schema: {

            name:
              "CivicFlowResponse",

            schema:
              responseSchema,

            strict: true

          }

        }

      });


    /* =========================================
       GET AI RESPONSE
    ========================================= */

    const rawResult =
      hfResponse
        ?.choices?.[0]
        ?.message
        ?.content;


    if (!rawResult) {

      throw new Error(
        "Hugging Face returned an empty response."
      );

    }


    console.log(
      "Hugging Face response received."
    );


    /* =========================================
       PARSE JSON
    ========================================= */

    let result;


    try {

      result =
        JSON.parse(rawResult);

    }

    catch (parseError) {

      console.error(
        "JSON PARSE ERROR:"
      );

      console.error(
        rawResult
      );

      throw new Error(
        "Hugging Face returned invalid JSON."
      );

    }


    /* =========================================
       BASIC RESPONSE VALIDATION
    ========================================= */

    if (

      !result.input_type ||

      typeof result.summary !== "string" ||

      !result.overall_priority ||

      !Array.isArray(result.issues)

    ) {

      throw new Error(
        "AI response does not match CivicFlow format."
      );

    }


    /* =========================================
       SUCCESS
    ========================================= */

    console.log(
      "CivicFlow analysis completed successfully."
    );

    console.log(
      "Issues detected:",
      result.issues.length
    );

    console.log(
      "Overall priority:",
      result.overall_priority
    );

    console.log(
      "================================"
    );


    /* =========================================
       SEND RESULT TO FRONTEND
    ========================================= */

    res.json(result);

  }


  /* =========================================
     ERROR HANDLING
  ========================================= */

  catch (error) {

    console.error("");

    console.error(
      "================================"
    );

    console.error(
      "CIVICFLOW AI ERROR"
    );

    console.error(
      "================================"
    );

    console.error(
      error
    );

    console.error("");


    res.status(500).json({

      error:
        "CivicFlow AI analysis failed.",

      details:
        error.message

    });

  }

});


/* =========================================
   START SERVER
========================================= */

app.listen(

  PORT,

  () => {

    console.log("");

    console.log(
      "================================"
    );

    console.log(
      "       CIVICFLOW AI BACKEND"
    );

    console.log(
      "================================"
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      "AI: Hugging Face Inference Providers"
    );

    console.log(
      `Model: ${MODEL}`
    );

    console.log(

      HF_TOKEN
        ? "AI Status: Token configured"
        : "AI Status: HF_TOKEN missing"

    );

    console.log(
      "================================"
    );

    console.log("");

  }

);