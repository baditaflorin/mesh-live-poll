import { useEffect, useMemo, useState } from "react";
import type { MeshConfig, YRoom } from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Option = { id: string; label: string };

const NAME_KEY = (prefix: string) => `${prefix}:displayName`;

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
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY(config.storagePrefix)) ?? "",
  );
  const [newOption, setNewOption] = useState("");
  const [questionDraft, setQuestionDraft] = useState("");
  const [editingQ, setEditingQ] = useState(false);
  const [, rerender] = useState(0);

  useEffect(() => {
    if (name) localStorage.setItem(NAME_KEY(config.storagePrefix), name);
  }, [name, config.storagePrefix]);

  useEffect(() => {
    const options = room.doc.getArray<Option>("options");
    const votes = room.doc.getMap<string>("votes");
    const meta = room.doc.getMap<string>("meta");
    const onChange = () => rerender((n) => n + 1);
    options.observeDeep(onChange);
    votes.observe(onChange);
    meta.observe(onChange);
    return () => {
      options.unobserveDeep(onChange);
      votes.unobserve(onChange);
      meta.unobserve(onChange);
    };
  }, [room]);

  const options = room.doc.getArray<Option>("options");
  const votes = room.doc.getMap<string>("votes");
  const meta = room.doc.getMap<string>("meta");
  const question = meta.get("question") ?? "";

  const optionList = useMemo(() => options.toArray(), [room, options.length]);

  const tally = useMemo(() => {
    const counts = new Map<string, number>();
    votes.forEach((optId) => counts.set(optId, (counts.get(optId) ?? 0) + 1));
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, votes.size, options.length]);

  const myVote = votes.get(room.peerId);
  const totalVotes = votes.size;
  const inRoom = room.peerCount + 1;

  const vote = (optId: string) => {
    if (!name.trim()) return;
    if (votes.get(room.peerId) === optId) {
      votes.delete(room.peerId);
    } else {
      votes.set(room.peerId, optId);
    }
  };

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
      votes.forEach((v, k) => {
        if (v === id) votes.delete(k);
      });
    });
  };

  const saveQuestion = () => {
    meta.set("question", questionDraft.trim());
    setEditingQ(false);
  };

  const startEditQ = () => {
    setQuestionDraft(question);
    setEditingQ(true);
  };

  return (
    <div className="poll-screen">
      <header className="poll-header">
        <h1>live poll</h1>
        <p className="poll-status">
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"} · {inRoom} present
        </p>
      </header>

      <div className="poll-question">
        {editingQ ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveQuestion();
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
          <button type="button" className="poll-q-display" onClick={startEditQ}>
            {question || <em>tap to set a question</em>}
          </button>
        )}
      </div>

      <div className="poll-name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          maxLength={48}
          aria-label="your name"
        />
      </div>

      <section className="poll-options" aria-label="options">
        {optionList.length === 0 ? (
          <p className="poll-empty">no options yet — add one below</p>
        ) : (
          optionList.map((opt) => {
            const count = tally.get(opt.id) ?? 0;
            const pct = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
            const isMine = myVote === opt.id;
            return (
              <div key={opt.id} className={`poll-option ${isMine ? "is-mine" : ""}`}>
                <button
                  type="button"
                  className="poll-option-btn"
                  onClick={() => vote(opt.id)}
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
