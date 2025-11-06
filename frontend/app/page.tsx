"use client";

import { useState, useEffect } from "react";
import Form from "@rjsf/shadcn";
import { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { IChangeEvent } from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import Editor from "@monaco-editor/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const uiSchema: UiSchema = {
  "ui:submitButtonOptions": {
    norender: true,
  },
};

interface ExtractionAttributes {
  [key: string]: unknown;
}

interface Extraction {
  extraction_class: string;
  extraction_text: string;
  attributes: ExtractionAttributes;
}

interface Example {
  text: string;
  extractions: Extraction[];
}

interface ExtractionRequest {
  prompt_description: string;
  examples: Example[];
  text_or_documents: string;
  model_id: string;
}

interface ExtractionResult {
  success: boolean;
  result?: Record<string, unknown>;
  message?: string;
}

const demoData: ExtractionRequest = {
  prompt_description:
    "Extract date, location, time, title, and description of the event. Use exact text for extractions. Do not paraphrase or overlap entities. Provide meaningful attributes for each entity to add context.",
  examples: [
    {
      text: "04.11. – Holzwerkstatt (WerkStadt Lüneburg, 16:00–20:00 Uhr)\nEinführung in die Kreissäge & Bau einer eigenen Kiste – nur noch wenige Plätze frei.",
      extractions: [
        {
          extraction_class: "date",
          extraction_text: "04.11.",
          attributes: {
            month: 11,
            day: 4,
          },
        },
        {
          extraction_class: "location",
          extraction_text: "WerkStadt Lüneburg",
          attributes: {
            name: "WerkStadt Lüneburg",
          },
        },
        {
          extraction_class: "time",
          extraction_text: "16:00–20:00 Uhr",
          attributes: {
            start_time: "16:00",
            end_time: "20:00",
          },
        },
      ],
    },
  ],
  text_or_documents:
    "04.12. – Formen gießen (Transformationsräume, 16:00–18:00 Uhr)\nGießen mit Raysin – nur noch wenige Restplätze.",
  model_id: "gemini-2.5-flash",
};

export default function Home() {
  const [schema, setSchema] = useState<RJSFSchema | null>(null);
  const [formData, setFormData] = useState<ExtractionRequest | null>(null);
  const [jsonEditorValue, setJsonEditorValue] = useState<string>("{}");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(
    null
  );

  // Fetch schema on mount
  useEffect(() => {
    fetch("http://localhost:8000/schema")
      .then((r) => r.json())
      .then((data) => {
        setSchema(data);
        // Initialize form data with default structure based on schema
        const defaultData: ExtractionRequest = {
          prompt_description: "",
          examples: [],
          text_or_documents: "",
          model_id: "gemini-2.5-flash",
        };
        setFormData(defaultData);
        setJsonEditorValue(JSON.stringify(defaultData, null, 2));
      })
      .catch((err) => {
        setError(`Failed to load schema: ${err.message}`);
      });
  }, []);

  // Sync form data to JSON editor when form changes
  const handleFormChange = (
    event: IChangeEvent<ExtractionRequest, RJSFSchema>
  ) => {
    const newFormData = event.formData;
    if (newFormData) {
      setFormData(newFormData);
      setJsonEditorValue(JSON.stringify(newFormData, null, 2));
    }
  };

  // Sync JSON editor to form data when editor changes
  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined) return;
    setJsonEditorValue(value);
    try {
      const parsed = JSON.parse(value) as ExtractionRequest;
      setFormData(parsed);
      setJsonValidationError(null);
    } catch {
      // Invalid JSON, but keep the value for editing
      setJsonValidationError("Invalid JSON");
    }
  };

  // Replace form data with demo data
  const handleReplaceWithDemo = () => {
    setFormData(demoData);
    setJsonEditorValue(JSON.stringify(demoData, null, 2));
    setJsonValidationError(null);
    setError(null);
  };

  // Submit the form data
  const handleSubmit = async () => {
    if (!formData) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `HTTP ${response.status}: ${response.statusText}`,
        }));

        // Properly stringify error data
        let errorMessage: string;
        if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else if (errorData.detail && typeof errorData.detail === "object") {
          errorMessage = JSON.stringify(errorData.detail, null, 2);
        } else if (errorData && typeof errorData === "object") {
          errorMessage = JSON.stringify(errorData, null, 2);
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const data: ExtractionResult = await response.json();
      setResult(data);
    } catch (err) {
      let errorMessage: string;
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === "object") {
        errorMessage = JSON.stringify(err, null, 2);
      } else {
        errorMessage = String(err);
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!schema) {
    return (
      <div className="min-h-screen px-4 py-6 sm:px-6 md:px-8 lg:px-12 xl:px-16 sm:py-8 md:py-12">
        <div className="mx-auto max-w-4xl">
          <div className="text-center py-12">
            {error ? (
              <p className="text-destructive">{error}</p>
            ) : (
              <p className="text-muted-foreground">Loading schema...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 md:px-8 lg:px-12 xl:px-16 sm:py-8 md:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <Tabs defaultValue="form" className="w-full">
          <div className="sticky top-0 z-10 bg-background py-2 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 xl:-mx-16 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 border-b border-border/40 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="form">Form</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
              <Button
                onClick={handleReplaceWithDemo}
                variant="outline"
                size="sm"
              >
                Replace with demo data
              </Button>
            </div>
          </div>
          <TabsContent value="form" className="mt-4">
            <div className="border rounded-lg p-4">
              <Form
                schema={schema}
                uiSchema={uiSchema}
                validator={validator}
                formData={formData}
                onChange={handleFormChange}
              />
            </div>
          </TabsContent>
          <TabsContent value="json" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height="600px"
                defaultLanguage="json"
                value={jsonEditorValue}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  formatOnPaste: true,
                  formatOnType: true,
                }}
              />
            </div>
            {jsonValidationError && (
              <p className="mt-2 text-sm text-destructive">
                {jsonValidationError}
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-center">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData}
            size="lg"
          >
            {isSubmitting ? "Running extraction..." : "Run extraction"}
          </Button>
        </div>

        {result && (
          <div className="border rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-semibold">Extraction Result</h2>
            {result.success ? (
              <div className="space-y-2">
                {result.message && (
                  <p className="text-sm text-muted-foreground">
                    {result.message}
                  </p>
                )}
                {result.result && (
                  <div className="border rounded p-4 bg-muted/50">
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-destructive">
                {result.message || "Extraction failed"}
              </p>
            )}
          </div>
        )}

        {error && result === null && (
          <div className="border rounded-lg p-4 border-destructive bg-destructive/10">
            <pre className="text-sm text-destructive whitespace-pre-wrap break-words">
              {error}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
