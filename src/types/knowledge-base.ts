export interface IngestedFile {
  id: string;
  name: string;
  date: string;
  size: string;
  type: "pdf" | "docx" | "txt" | "md";
}
