import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./TrophyRoad.css";

function TrophyRoad({
  trophies,
  currentArena,
  arenas,
  rewards,
  claimedRewards,
  onClaim,
  onClose,
}) {
  const currentMilestoneRef = useRef(null);
  const progressRailRef = useRef(null);
  const currentTrophyBadgeRef = useRef(null);
  const [progressFillHeight, setProgressFillHeight] = useState(0);

const orderedArenaSections = useMemo(() => {
  return [...arenas]
    .reverse()
    .map((arena) => ({
      arena,
      rewards: rewards
        .filter((reward) => reward.arena === arena.id)
        .sort((a, b) => b.threshold - a.threshold),
    }))
    .filter((section) => section.rewards.length > 0);
}, [arenas, rewards]);

const currentMilestone = useMemo(() => {
  return [...rewards]
    .filter((reward) => reward.threshold <= trophies)
    .sort((a, b) => b.threshold - a.threshold)[0];
}, [rewards, trophies]);

const minimumThreshold = Math.min(
  ...rewards.map((reward) => reward.threshold)
);

const maximumThreshold = Math.max(
  ...rewards.map((reward) => reward.threshold)
);

const totalRoadProgress = Math.min(
  Math.max(
    ((trophies - minimumThreshold) /
      (maximumThreshold - minimumThreshold)) *
      100,
    0
  ),
  100
);

useEffect(() => {
  const timer = window.setTimeout(() => {
    currentMilestoneRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 150);

  return () => window.clearTimeout(timer);
}, []);
useLayoutEffect(() => {
  function updateProgressFill() {
    const rail = progressRailRef.current;
    const badge = currentTrophyBadgeRef.current;

    if (!rail || !badge) return;

    const railRect = rail.getBoundingClientRect();
    const badgeRect = badge.getBoundingClientRect();

    const badgeCenter =
      badgeRect.top + badgeRect.height / 2;

    const fillHeight = railRect.bottom - badgeCenter;

    setProgressFillHeight(
      Math.max(0, Math.min(fillHeight, railRect.height))
    );
  }

  const frame = window.requestAnimationFrame(
    updateProgressFill
  );

  const timer = window.setTimeout(
    updateProgressFill,
    400
  );

  const resizeObserver = new ResizeObserver(
    updateProgressFill
  );

  if (progressRailRef.current) {
    resizeObserver.observe(progressRailRef.current);
  }

  if (currentTrophyBadgeRef.current) {
    resizeObserver.observe(currentTrophyBadgeRef.current);
  }

  window.addEventListener("resize", updateProgressFill);

  return () => {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    resizeObserver.disconnect();
    window.removeEventListener(
      "resize",
      updateProgressFill
    );
  };
}, [trophies, orderedArenaSections]);

  function handleRewardClick(reward) {
    const available = trophies >= reward.threshold;
    const claimed = claimedRewards.includes(reward.id);

    if (!available || claimed) return;

    onClaim(reward);
  }

  return (
    <section className="new-trophy-road">
      <header className="trophy-road-title-bar">
        <h1>TROPHY ROAD</h1>
      </header>

      <div className="trophy-road-content">
                <aside className="trophy-progress-column">

       <div
        ref={progressRailRef}
        className="vertical-progress-shell"
        >
            <div
            className="vertical-progress-fill"
            style={{ height: `${progressFillHeight}px` }}
            />
        </div>
        </aside>

        <main className="trophy-road-main">

          <section className="road-reward-list">
  {orderedArenaSections.map((section) => {
    const sectionArenaIndex = arenas.findIndex(
      (arena) => arena.id === section.arena.id
    );

    return (
      <section
        className="road-arena-section"
        key={section.arena.id}
      >
        <div className="road-section-rewards">
          {section.rewards.map((reward, index) => {
            const available = trophies >= reward.threshold;
            const claimed = claimedRewards.includes(reward.id);
            const isCurrentMilestone =
              currentMilestone?.id === reward.id;

            return (
              <div
              
                ref={
                  isCurrentMilestone
                    ? currentMilestoneRef
                    : null
                }
                className={`road-reward-row ${
                  isCurrentMilestone
                    ? "current-road-milestone"
                    : ""
                }`}
                key={reward.id}
              >
                {isCurrentMilestone && (
                <div
                    ref={currentTrophyBadgeRef}
                    className="current-trophy-badge"
                >
                <span className="trophy-symbol">🏆</span>
                <strong>{trophies}</strong>
            </div>
            )}
                <div className="road-threshold">
                  {reward.threshold}
                </div>

                <article
                  className={`road-floating-island ${
                    available ? "island-unlocked" : ""
                  }`}
                >
                  <div
                    className={`road-reward-box ${
                      claimed ? "reward-is-claimed" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="road-reward-button"
                      disabled={!available || claimed}
                      onClick={() => handleRewardClick(reward)}
                      aria-label={`Claim ${reward.title}`}
                    >
                      {reward.art ? (
                        <img
                          src={reward.art}
                          alt={reward.title}
                          className="road-reward-image"
                        />
                      ) : (
                        <span className="reward-placeholder">
                          ?
                        </span>
                      )}
                    </button>

                    {claimed && (
                      <span className="reward-checkmark">
                        ✓
                      </span>
                    )}
                  </div>

                  <div
                    className={`island-decoration island-decoration-${
                      index % 3
                    }`}
                  >
                    <span />
                    <span />
                    <span />
                  </div>
                </article>
              </div>
            );
          })}
        </div>

        {/* Arena marker sits below its rewards */}
        <div className="road-section-banner">
          {section.arena.art ? (
            <img
              src={section.arena.art}
              alt={section.arena.name}
              className="road-section-arena-image"
            />
          ) : (
            <div className="road-section-arena-placeholder">
              COMING SOON
            </div>
          )}

          <h2>{section.arena.name}</h2>

          <div className="road-section-arena-info">
            <strong>
              ARENA {sectionArenaIndex + 1}
            </strong>

            <span>
              🏆 {section.arena.min}
            </span>
          </div>
        </div>
      </section>
    );
  })}
</section>

          <button
            type="button"
            className="trophy-road-ok-button"
            onClick={onClose}
          >
            OK
          </button>
        </main>
      </div>
    </section>
  );
}

export default TrophyRoad;