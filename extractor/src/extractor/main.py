import langextract as lx
import textwrap
from dotenv import load_dotenv

load_dotenv()


# 1. Define the prompt and extraction rules
prompt = textwrap.dedent(
    """\
    Extract date, location, time, title, and description of the event.
    Use exact text for extractions. Do not paraphrase or overlap entities.
    Provide meaningful attributes for each entity to add context."""
)

# 2. Provide a high-quality example to guide the model
examples = [
    lx.data.ExampleData(
        text="04.11. – Holzwerkstatt (WerkStadt Lüneburg, 16:00–20:00 Uhr)\nEinführung in die Kreissäge & Bau einer eigenen Kiste – nur noch wenige Plätze frei.",
        extractions=[
            lx.data.Extraction(
                extraction_class="date",
                extraction_text="04.11.",
                attributes={"month": 11, "day": 4},
            ),
            lx.data.Extraction(
                extraction_class="location",
                extraction_text="WerkStadt Lüneburg",
                attributes={"name": "WerkStadt Lüneburg"},
            ),
            lx.data.Extraction(
                extraction_class="time",
                extraction_text="16:00–20:00 Uhr",
                attributes={"start_time": "16:00", "end_time": "20:00"},
            ),
            lx.data.Extraction(
                extraction_class="title",
                extraction_text="Holzwerkstatt",
                attributes={"name": "Holzwerkstatt"},
            ),
            lx.data.Extraction(
                extraction_class="description",
                extraction_text="Einführung in die Kreissäge & Bau einer eigenen Kiste – nur noch wenige Plätze frei.",
                attributes={
                    "description": "Einführung in die Kreissäge & Bau einer eigenen Kiste – nur noch wenige Plätze frei."
                },
            ),
        ],
    )
]

# The input text to be processed
input_text = "04.12. – Formen gießen (Transformationsräume, 16:00–18:00 Uhr)\nGießen mit Raysin – nur noch wenige Restplätze."

# Run the extraction
result = lx.extract(
    text_or_documents=input_text,
    prompt_description=prompt,
    examples=examples,
    model_id="gemini-2.5-flash",
)

# Save the results to a JSONL file
lx.io.save_annotated_documents(
    [result], output_name="extraction_results.jsonl", output_dir="."
)

# Generate the visualization from the file
html_content = lx.visualize("extraction_results.jsonl")
with open("visualization.html", "w") as f:
    if hasattr(html_content, "data"):
        f.write(html_content.data)  # For Jupyter/Colab
    else:
        f.write(html_content)
