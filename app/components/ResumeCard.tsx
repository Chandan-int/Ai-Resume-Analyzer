import { Link } from "react-router";
import ScoreCircle from "./ScoreCircle";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";

const ResumeCard = ({
  resume: { id, companyName, jobTitle, feedback, imagePath },
}: {
  resume: Resume;
}) => {
  const [resumeUrl, setResumeUrl] = useState("");
  const { fs } = usePuterStore();

  useEffect(() => {
    let objectUrl = "";
    let isMounted = true;

    const loadResumeImage = async () => {
      if (!imagePath) return;

      // Only static public assets (like /images/resume_01.png) or external http/data URLs use direct src
      if (
        imagePath.startsWith("/images/") ||
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://") ||
        imagePath.startsWith("data:")
      ) {
        if (isMounted) setResumeUrl(imagePath);
        return;
      }

      // All Puter FS paths are read asynchronously from Puter filesystem
      try {
        const blob = await fs.read(imagePath);
        if (!blob) return;

        const typedBlob = new Blob([blob], { type: "image/png" });
        objectUrl = URL.createObjectURL(typedBlob);
        if (isMounted) {
          setResumeUrl(objectUrl);
        }
      } catch (err) {
        console.error("Failed to read image blob:", imagePath, err);
      }
    };

    loadResumeImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imagePath, fs]);

  return (
    <Link
      to={`/resume/${id}`}
      className="resume-card animate-in fade-in duration-1000"
    >
      <div className="resume-card-header">
        <div className="flex flex-col gap-2">
          {companyName && (
            <h2 className="!text-black font-bold break-words">{companyName}</h2>
          )}
          {jobTitle && (
            <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>
          )}
          {!companyName && !jobTitle && (
            <h2 className="!text-black font-bold ">Resume</h2>
          )}
        </div>

        <div className="flex-shrink-0">
          <ScoreCircle score={feedback?.overallScore || 0} />
        </div>
      </div>

      {resumeUrl && (
        <div className="gradient-border animate-in fade-in duration-1000">
          <div className="w-full h-full">
            <img
              src={resumeUrl}
              alt="resume"
              className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
            />
          </div>
        </div>
      )}
    </Link>
  );
};

export default ResumeCard;