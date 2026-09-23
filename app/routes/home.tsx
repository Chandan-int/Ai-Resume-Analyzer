import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { usePuterStore } from "~/lib/puter";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job" },
  ];
}

export default function Home() {
  const { isLoading, auth, kv } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate("/auth?next=/");
    }
  }, [isLoading, auth.isAuthenticated, navigate]);

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);
      const rawResumes = (await kv.list("resume:*", true)) as KVItem[];
      const parsedResumes = rawResumes?.map(
        (item) => JSON.parse(item.value) as Resume
      );
      console.log("parsedResumes", parsedResumes);
      setResumes(parsedResumes || []);
      setLoadingResumes(false);
    };

    if (auth.isAuthenticated) {
      loadResumes();
    }
  }, [auth.isAuthenticated]);

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Track Your Application & Resume Ratings</h1>
          {!loadingResumes &&
            (resumes.length === 0 ? (
              <h2>No resumes found. Upload your resumes to get feedback.</h2>
            ) : (
              <h2>Review Your Submissions and check AI-powered feedback.</h2>
            ))}
        </div>

        {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img
              src="/images/resume-scan-2.gif"
              alt="loading"
              className="w-[200px]"
            />
          </div>
        )}

        {!loadingResumes && resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        )}

        {!loadingResumes && resumes.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link
              to="/upload"
              className="primary-button w-fit text-xl font-semibold"
            >
              Upload Resume
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

