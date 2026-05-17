import { useEffect, useState } from "react";
import {
  MeshNameInput,
  useNamedPeer,
  useVotes,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };
type Option = { id: string; label: string };

const newId = () => Math.random().toString(36).slice(2, 10);

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <div className="poll-screen">
        <h1>live poll</h1>
        <p className="poll-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  // primitives #1 + #4: name + votes
  const { name, setName } = useNamedPeer(config, room);
  const votes = useVotes<string>(room, "votes");

  const [newOption, setNewOption] = useState("");
  const [questionDraft, setQuestionDraft] = useState("");
  const [editingQ, setEditingQ] = useState(false);
  const [, rerender] = useState(0);

  useEffect(() => {
    const options = room.doc.getArray<Option>("options");
    const meta = room.doc.getMap<string>("meta");
    const cb = () => rerender((n) => n + 1);
    options.observeDeep(cb);
    meta.observe(cb);
    return () => {
      options.unobserveDeep(cb);
      meta.unobserve(cb);
    };
  }, [room]);

  const options = room.doc.getArray<Option>("options");
  const meta = room.doc.getMap<string>("meta");
  const question = meta.get("question") ?? "";
  const optionList = options.toArray();

  const addOption = () => {
    const label = newOption.trim();
    if (!label) return;
    options.push([{ id: newId(), label }]);
    setNewOption("");
  };

  const removeOption = (id: string) => {
    room.doc.transact(() => {
      const idx = options.toArray().findIndex((o) => o.id === id);
      if (idx >= 0) options.delete(idx, 1);
    });
    if (votes.myVote === id) votes.unvote();
  };

  const handleVote = (optId: string) => {
    if (!name.trim()) return;
    if (votes.myVote === optId) votes.unvote();
    else votes.vote(optId);
  };

  return (
    <div className="poll-screen">
      <header className="poll-header">
        <h1>live poll</h1>
        <p className="poll-status">
          {votes.totalVotes} {votes.totalVotes === 1 ? "vote" : "votes"} · {room.peerCount + 1}{" "}
          present
        </p>
      </header>

      <div className="poll-question">
        {editingQ ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              meta.set("question", questionDraft.trim());
              setEditingQ(false);
            }}
            className="poll-q-edit"
          >
            <input
              value={questionDraft}
              onChange={(e) => setQuestionDraft(e.target.value)}
              placeholder="ask a question"
              autoFocus
              maxLength={200}
            />
            <button type="submit">save</button>
            <button type="button" onClick={() => setEditingQ(false)}>
              cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="poll-q-display"
            onClick={() => {
              setQuestionDraft(question);
              setEditingQ(true);
            }}
          >
            {question || <em>tap to set a question</em>}
          </button>
        )}
      </div>

      <MeshNameInput
        value={name}
        onChange={setName}
        placeholder="your name"
        maxLength={48}
        className="poll-name"
      />

      <section className="poll-options" aria-label="options">
        {optionList.length === 0 ? (
          <p className="poll-empty">no options yet — add one below</p>
        ) : (
          optionList.map((opt) => {
            const count = votes.tally.get(opt.id) ?? 0;
            const pct = votes.pctOf(opt.id);
            const isMine = votes.myVote === opt.id;
            return (
              <div key={opt.id} className={`poll-option ${isMine ? "is-mine" : ""}`}>
                <button
                  type="button"
                  className="poll-option-btn"
                  onClick={() => handleVote(opt.id)}
                  disabled={!name.trim()}
                >
                  <span className="poll-option-bar" style={{ width: `${pct}%` }} />
                  <span className="poll-option-label">{opt.label}</span>
                  <span className="poll-option-count">
                    {count} {pct > 0 ? `· ${pct}%` : ""}
                  </span>
                </button>
                <button
                  type="button"
                  className="poll-option-rm"
                  onClick={() => removeOption(opt.id)}
                  aria-label={`remove ${opt.label}`}
                  title="remove option"
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </section>

      <form
        className="poll-add"
        onSubmit={(e) => {
          e.preventDefault();
          addOption();
        }}
      >
        <input
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          placeholder="add an option"
          maxLength={80}
          aria-label="new option"
        />
        <button type="submit" disabled={!newOption.trim()}>
          + add
        </button>
      </form>
    </div>
  );
}
