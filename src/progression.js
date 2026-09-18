/**
 * Quest progress and the stage the run is at.
 *
 * Both are placeholders: there are no quests and no stages yet, so progress
 * sits at 0 and the stage is null. The panels read from here so that when
 * either lands there is one place to fill in.
 */
export function createProgression() {
  return {
    quest: null,       // { title, progress: 0..1 } once there are quests
    stage: null,       // { number, name } once there are stages

    /** 0-100, as the panels show it. */
    get questPercent() {
      return Math.round((this.quest?.progress ?? 0) * 100);
    },

    get stageLabel() {
      if (!this.stage) return 'None yet';
      return `${this.stage.number} — ${this.stage.name}`;
    }
  };
}
