import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText } from 'lucide-react'

export default function ResumeUploader({ onUpload, loading, file }) {
  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) onUpload(accepted[0])
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: loading,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
        isDragActive ? 'border-accent bg-accent/5' : 'border-gray-300 hover:border-accent hover:bg-gray-50'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      {file ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <p className="font-medium text-slate-900">{file.name}</p>
          <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <Upload className="w-6 h-6 text-slate-400" />
          </div>
          <p className="font-medium text-slate-900">
            {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume (PDF)'}
          </p>
          <p className="text-xs text-slate-500">or click to browse</p>
        </div>
      )}
    </div>
  )
}
