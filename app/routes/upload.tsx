import {useState, type FormEvent} from 'react'
import { useNavigate } from 'react-router';
import FileUploader from '~/components/FileUploader';
import Navbar from '~/components/Navbar'
import { convertPdfToImage } from '~/lib/pdf2img';
import { usePuterStore } from '~/lib/puter';
import { generateUUID } from '~/lib/utils';

const upload = () => {
const {auth,isLoading, fs, ai, kv}=usePuterStore();
const navigate=useNavigate();
    const[isProcessing, setIsProcessing] = useState(false);
    const[statusText, setStatusText] = useState('');
    const [file, setFile]= useState<File | null>(null);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form=e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title')as string;
        const jobDescription = formData.get('job-description')as string;

        if(!file) return;

        handleAnalyze({companyName, jobTitle, jobDescription, file});

    }
const handleFileSelect = (file: File | null) => {
    setFile(file);
}
const handleAnalyze=async({companyName, jobTitle, jobDescription, file}:{companyName:string, jobTitle:string, jobDescription:string, file:File})=>{
setIsProcessing(true);
setStatusText('Analyzing your resume...'); 
const uploadFile= await fs.upload([file]);

if(!uploadFile ) return setStatusText('Failed to upload file. Please try again.');

setStatusText('File uploaded successfully. Generating feedback...');
const imageFile= await convertPdfToImage(file);
if(!imageFile.file) return setStatusText('Failed to convert PDF to image. Please try again.');

setStatusText('Generating feedback...');
const uploadImage= await fs.upload([imageFile.file]);
if(!uploadImage) return setStatusText('Failed to upload image. Please try again.');
setStatusText('Feedback generated successfully. Saving data...');

const uuid= generateUUID();
const data={
    id: uuid,
    resumePath: uploadFile.path,
    imagePath: uploadImage.path,
    companyName,
    jobTitle,
    jobDescription,
   feedback:'',
}
await kv.set(`resume:${uuid}`,JSON.stringify(data));
setStatusText('Data saved successfully. Redirecting...');

const feedback= await ai.feedback
navigate(`/resume/${uuid}`);
}

  return (
<main className="bg-[url('/images/bg-main.svg')] bg-cover">
<Navbar />
    <section className="main-section">
      <div className="page-heading py-16 ">
        <h1>Smart feedback for your dream job</h1>
        {isProcessing ? (
            <>
<h2>{statusText}</h2>
<img src='/images/resume-scan.gif' className='w-full' />

            </>
            ): (
            <h2>Drop your resume for an ATS score and improvement.</h2>
            )}
            {!isProcessing && (
               <form id='upload-form' onSubmit={handleSubmit} className='flex flex-col gap-4 mt-8'>
                <div className='form-div'>
                    <label htmlFor='company-name'>Company Name</label>
                    <input type='text' name='company-name' id='company-name' placeholder='Enter company name' />
                </div>
                <div className='form-div'>
                    <label htmlFor='job-title'>Job Title</label>
                    <input type='text' name='job-title' id='job-title' placeholder='Enter job title' />
                </div>
                <div className='form-div'>
                    <label htmlFor='job-description'>Job Description</label>
                    <textarea rows={5} name='job-description' id='job-description' placeholder='Enter job description' />
                </div>
                <div className='form-div'>
                    <label htmlFor='uploader'>Upload Resume</label>
                    <FileUploader onFileSelect={handleFileSelect}/>
                </div>
                <button className='primary-button' type='submit'>
                    Analyze Resume
                </button>
                </form>
            )}
            </div>
    </section>
    </main>
)
}

export default upload