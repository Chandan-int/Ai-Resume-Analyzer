import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import FileUploader from "~/components/FileUploader";
import Navbar from "~/components/Navbar";
import { prepareInstructions } from "~/constants";
import { convertPdfToImage } from "~/lib/pdf2img";
import { usePuterStore } from "~/lib/puter";
import { generateUUID } from "~/lib/utils";

const Upload = () => {
  const { auth, isLoading, fs, ai, kv } = usePuterStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest("form");
    if (!form) return;
    const formData = new FormData(form);

    const companyName = formData.get("company-name") as string;
    const jobTitle = formData.get("job-title") as string;
    const jobDescription = formData.get("job-description") as string;

    if (!file) return;

    handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

  const handleFileSelect = (file: File | null) => {
    setFile(file);
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setIsProcessing(true);
    try {
      setStatusText("Uploading your resume...");
      const uploadFile = await fs.upload([file]);
      if (!uploadFile) {
        setIsProcessing(false);
        return setStatusText("Failed to upload resume file. Please try again.");
      }

      setStatusText("Converting PDF preview...");
      const imageFile = await convertPdfToImage(file);
      if (!imageFile.file) {
        setIsProcessing(false);
        return setStatusText(
          imageFile.error || "Failed to convert PDF to image. Please try again."
        );
      }

      setStatusText("Uploading preview image...");
      const uploadImage = await fs.upload([imageFile.file]);
      if (!uploadImage) {
        setIsProcessing(false);
        return setStatusText("Failed to upload preview image. Please try again.");
      }

      const uuid = generateUUID();
      const data = {
        id: uuid,
        resumePath: uploadFile.path,
        imagePath: uploadImage.path,
        companyName,
        jobTitle,
        jobDescription,
        feedback: null as any,
      };

      setStatusText("Analyzing resume with AI (this may take a few seconds)...");
      const feedbackResponse = await ai.feedback(
        uploadFile.path,
        prepareInstructions({ jobTitle, jobDescription })
      );

      let feedbackText = "";
      if (typeof feedbackResponse === "string") {
        feedbackText = feedbackResponse;
      } else if (feedbackResponse?.message?.content) {
        const rawContent = feedbackResponse.message.content;
        feedbackText =
          typeof rawContent === "string"
            ? rawContent
            : (rawContent[0] as { text: string })?.text || "";
      } else if ((feedbackResponse as any)?.text) {
        feedbackText = (feedbackResponse as any).text;
      } else if (typeof feedbackResponse === "object") {
        feedbackText = JSON.stringify(feedbackResponse);
      }

      if (!feedbackText) {
        setIsProcessing(false);
        return setStatusText("Failed to generate AI feedback. Please try again.");
      }

      let cleanJsonText = feedbackText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const firstBrace = cleanJsonText.indexOf("{");
      const lastBrace = cleanJsonText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanJsonText = cleanJsonText.substring(firstBrace, lastBrace + 1);
      }

      try {
        let parsed: any = JSON.parse(cleanJsonText);
        if (parsed && typeof parsed === "object") {
          if (parsed.feedback && typeof parsed.feedback === "object") {
            parsed = parsed.feedback;
          } else if (parsed.Feedback && typeof parsed.Feedback === "object") {
            parsed = parsed.Feedback;
          } else if (parsed.data && typeof parsed.data === "object") {
            parsed = parsed.data;
          }
        }

        const getCategory = (obj: any, keys: string[]) => {
          if (!obj || typeof obj !== "object") return null;
          for (const k of keys) {
            if (obj[k] !== undefined && obj[k] !== null) {
              const val = obj[k];
              if (typeof val === "number") {
                return { score: val, tips: [] };
              }
              if (typeof val === "object") {
                return {
                  score: typeof val.score === "number" ? val.score : 75,
                  tips: Array.isArray(val.tips) ? val.tips : (Array.isArray(val.suggestions) ? val.suggestions : []),
                };
              }
            }
          }
          return null;
        };

        const normalizeTips = (tipsList: any[]) => {
          if (!Array.isArray(tipsList)) return [];
          return tipsList.map((item: any) => {
            if (typeof item === "string") {
              return { type: "improve" as const, tip: item, explanation: item };
            }
            const type = item?.type === "good" ? ("good" as const) : ("improve" as const);
            const tip = item?.tip || item?.title || item?.suggestion || "Recommendation";
            const explanation = item?.explanation || item?.description || item?.detail || tip;
            return { type, tip, explanation };
          });
        };

        const atsData = getCategory(parsed, ["ATS", "ats", "atsScore"]);
        const toneData = getCategory(parsed, ["toneAndStyle", "tone_and_style", "tone", "style"]);
        const contentData = getCategory(parsed, ["content", "contentScore"]);
        const structData = getCategory(parsed, ["structure", "structureScore", "formatting"]);
        const skillsData = getCategory(parsed, ["skills", "skillsScore", "technicalSkills"]);

        const scores = [
          atsData?.score,
          toneData?.score,
          contentData?.score,
          structData?.score,
          skillsData?.score,
        ].filter((s): s is number => typeof s === "number");

        const calculatedAvg = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 75;

        data.feedback = {
          overallScore: typeof parsed?.overallScore === "number" ? parsed.overallScore : calculatedAvg,
          ATS: {
            score: atsData?.score ?? 75,
            tips: normalizeTips(atsData?.tips || []),
          },
          toneAndStyle: {
            score: toneData?.score ?? 75,
            tips: normalizeTips(toneData?.tips || []),
          },
          content: {
            score: contentData?.score ?? 75,
            tips: normalizeTips(contentData?.tips || []),
          },
          structure: {
            score: structData?.score ?? 75,
            tips: normalizeTips(structData?.tips || []),
          },
          skills: {
            score: skillsData?.score ?? 75,
            tips: normalizeTips(skillsData?.tips || []),
          },
        };
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr, "Raw feedback:", feedbackText);
        setIsProcessing(false);
        return setStatusText("Failed to parse AI feedback format. Please try again.");
      }

      setStatusText("Saving results and redirecting...");
      await kv.set(`resume:${uuid}`, JSON.stringify(data));
      console.log("Saved resume:", data);
      navigate(`/resume/${uuid}`);
    } catch (err) {
      console.error("Analysis error:", err);
      setIsProcessing(false);
      setStatusText(`An error occurred: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16 ">
          <h1>Smart feedback for your dream job</h1>
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img
                src="/images/resume-scan.gif"
                alt="scanning"
                className="w-full"
              />
            </>
          ) : (
            <h2>Drop your resume for an ATS score and improvement.</h2>
          )}
          {!isProcessing && (
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-8"
            >
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input
                  type="text"
                  name="company-name"
                  id="company-name"
                  placeholder="Enter company name"
                />
              </div>
              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input
                  type="text"
                  name="job-title"
                  id="job-title"
                  placeholder="Enter job title"
                />
              </div>
              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea
                  rows={5}
                  name="job-description"
                  id="job-description"
                  placeholder="Enter job description"
                />
              </div>
              <div className="form-div">
                <label htmlFor="uploader">Upload Resume</label>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>
              <button className="primary-button" type="submit">
                Analyze Resume
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default Upload;