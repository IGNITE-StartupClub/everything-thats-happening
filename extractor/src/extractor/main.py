import langextract as lx
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Extractor API",
    description="HTTP server for text extraction using langextract",
    version="0.1.0",
)

# Configure CORS to allow all origins, methods, and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)


class Extraction(BaseModel):
    extraction_class: str = Field(
        ..., description="The class/category of the extraction"
    )
    extraction_text: str = Field(..., description="The extracted text")
    attributes: Dict[str, Any] = Field(
        default_factory=dict, description="Additional attributes for the extraction"
    )


class Example(BaseModel):
    text: str = Field(..., description="The example text")
    extractions: List[Extraction] = Field(
        ..., description="List of extractions from the example"
    )


class ExtractionRequest(BaseModel):
    prompt_description: str = Field(
        ..., description="Description of what to extract and how"
    )
    examples: List[Example] = Field(
        ..., description="List of example text-extraction pairs for few-shot learning"
    )
    text_or_documents: str = Field(
        ..., description="The text or documents to extract information from"
    )
    model_id: str = Field(
        ..., description="The model ID to use for extraction (e.g., 'gemini-2.5-flash')"
    )


class ExtractionResponse(BaseModel):
    success: bool = Field(..., description="Whether the extraction was successful")
    result: Optional[Dict[str, Any]] = Field(None, description="The extraction result")
    message: Optional[str] = Field(None, description="Optional message")


@app.get("/schema", response_class=JSONResponse)
async def get_schema():
    """
    Get the JSON schema for the extraction request.
    This endpoint follows standards-compliant schema exposure conventions.
    """
    return ExtractionRequest.model_json_schema()


@app.post("/extract", response_model=ExtractionResponse)
async def extract(data: ExtractionRequest):
    """
    Extract information from text using the provided examples and prompt.

    - **prompt_description**: Description of what to extract
    - **examples**: Example text-extraction pairs for few-shot learning
    - **text_or_documents**: The text to extract from
    - **model_id**: The model to use for extraction
    """
    try:
        # Convert Pydantic models to langextract format
        examples = []
        for example in data.examples:
            examples.append(
                lx.data.ExampleData(
                    text=example.text,
                    extractions=[
                        lx.data.Extraction(
                            extraction_class=extraction.extraction_class,
                            extraction_text=extraction.extraction_text,
                            attributes=extraction.attributes,
                        )
                        for extraction in example.extractions
                    ],
                )
            )

        # Run the extraction
        result = lx.extract(
            text_or_documents=data.text_or_documents,
            prompt_description=data.prompt_description,
            examples=examples,
            model_id=data.model_id,
        )

        # Convert result to dict for JSON response
        # The result is an AnnotatedDocument, we need to serialize it
        result_dict = {
            "text": result.text,
            "document_id": (
                result.document_id if hasattr(result, "document_id") else None
            ),
            "extractions": [
                {
                    "extraction_class": ext.extraction_class,
                    "extraction_text": ext.extraction_text,
                    "attributes": ext.attributes,
                    "char_interval": (
                        {
                            "start_pos": ext.char_interval.start_pos,
                            "end_pos": ext.char_interval.end_pos,
                        }
                        if hasattr(ext, "char_interval") and ext.char_interval
                        else None
                    ),
                    "alignment_status": (
                        ext.alignment_status
                        if hasattr(ext, "alignment_status")
                        else None
                    ),
                    "extraction_index": (
                        ext.extraction_index
                        if hasattr(ext, "extraction_index")
                        else None
                    ),
                    "group_index": (
                        ext.group_index if hasattr(ext, "group_index") else None
                    ),
                    "description": (
                        ext.description if hasattr(ext, "description") else None
                    ),
                }
                for ext in result.extractions
            ],
        }

        return ExtractionResponse(
            success=True,
            result=result_dict,
            message="Extraction completed successfully",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Extractor API",
        "version": "0.1.0",
        "endpoints": {
            "schema": "/schema",
            "openapi": "/openapi.json",
            "docs": "/docs",
            "extract": "/extract (POST)",
        },
    }
