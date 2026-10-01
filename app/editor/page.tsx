import EditorLoader from "@/components/EditorLoader";
import { storeEnabled } from "@/lib/store";

export default function EditorPage() {
  return <EditorLoader canPublish={storeEnabled} canUpload={Boolean(process.env.BLOB_READ_WRITE_TOKEN)} />;
}
