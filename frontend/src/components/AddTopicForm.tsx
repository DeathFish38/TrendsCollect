import { FormEvent, useState } from "react";
import { useCreateTopic } from "../hooks/useTopics";
import { useToast } from "./Toast";

/** Inline keyword + label fields; creates the topic and triggers an immediate snapshot. */
export default function AddTopicForm() {
  const [keyword, setKeyword] = useState("");
  const [label, setLabel] = useState("");
  const create = useCreateTopic();
  const toast = useToast();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return;
    create.mutate(
      { keyword: trimmedKeyword, label: label.trim() || undefined },
      {
        onSuccess: (topic) => {
          setKeyword("");
          setLabel("");
          toast(`Added ${topic.label}. First snapshot is on its way.`);
        },
      },
    );
  };

  return (
    <form className="add-topic" onSubmit={onSubmit}>
      <input
        className="field"
        placeholder='Keyword (e.g. "rust")'
        aria-label="Keyword"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <input
        className="field"
        placeholder="Label (optional — e.g. Rust)"
        aria-label="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <button
        className="btn"
        type="submit"
        disabled={create.isPending || !keyword.trim()}
      >
        Add Topic
      </button>
      {create.isError && (
        <p className="form-error">
          {create.error instanceof Error ? create.error.message : "Failed to add topic."}
        </p>
      )}
    </form>
  );
}
