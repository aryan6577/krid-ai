alter table exercise_sessions
  add column if not exists detected_result jsonb not null default '{}'::jsonb,
  add column if not exists correction_flags jsonb not null default '{}'::jsonb;

create index if not exists exercise_sessions_player_start_desc_idx
  on exercise_sessions(player_id, start_at desc);

do $$
begin
  if not exists (select 1 from exercises where lower(name) = lower('Bodyweight squat')) then
    insert into exercises (name, difficulty, camera_view, target_metrics, thresholds, cues)
    values (
      'Bodyweight squat',
      'Foundation',
      'Side/front',
      '["knee_flexion_range", "depth_consistency", "trunk_angle", "rep_count"]'::jsonb,
      '{"topKneeAngle":155,"bottomKneeAngle":105,"minKneeRange":45,"maxDepthVariation":18,"maxTrunkLean":35,"minRepDurationMs":650,"maxRepDurationMs":5000}'::jsonb,
      array['Depth', 'Tempo', 'Stance consistency']
    );
  end if;

  if not exists (select 1 from exercises where lower(name) = lower('Forward lunge')) then
    insert into exercises (name, difficulty, camera_view, target_metrics, thresholds, cues)
    values (
      'Forward lunge',
      'Foundation',
      'Side/front',
      '["front_knee_angle", "front_hip_angle", "step_consistency", "rep_count"]'::jsonb,
      '{"topKneeAngle":155,"bottomKneeAngle":112,"minKneeRange":38,"minStepLengthRatio":1.15,"maxStepVariation":0.35,"maxKneeTrackingOffsetRatio":0.38,"minRepDurationMs":700,"maxRepDurationMs":5500}'::jsonb,
      array['Step length', 'Balance cue', 'Knee tracking proxy']
    );
  end if;

  if not exists (select 1 from exercises where lower(name) = lower('Push-up')) then
    insert into exercises (name, difficulty, camera_view, target_metrics, thresholds, cues)
    values (
      'Push-up',
      'Foundation',
      'Side',
      '["elbow_angle", "body_line_proxy", "rep_count"]'::jsonb,
      '{"topElbowAngle":155,"bottomElbowAngle":105,"minElbowRange":45,"maxBodyLineDeviation":24,"minRepDurationMs":650,"maxRepDurationMs":4500}'::jsonb,
      array['Range of motion', 'Tempo', 'Hip position proxy']
    );
  end if;

  if not exists (select 1 from exercises where lower(name) = lower('Plank')) then
    insert into exercises (name, difficulty, camera_view, target_metrics, thresholds, cues)
    values (
      'Plank',
      'Foundation',
      'Side',
      '["body_line_proxy", "hold_duration"]'::jsonb,
      '{"maxBodyLineDeviation":22,"minAlignedFrameRatio":0.75}'::jsonb,
      array['Alignment cue', 'Hold duration']
    );
  end if;

  if not exists (select 1 from exercises where lower(name) = lower('Jumping jack')) then
    insert into exercises (name, difficulty, camera_view, target_metrics, thresholds, cues)
    values (
      'Jumping jack',
      'Foundation',
      'Front',
      '["limb_separation", "cycle_count"]'::jsonb,
      '{"closedSeparationRatio":1.15,"openSeparationRatio":2.1,"minCycleDurationMs":450,"maxCycleDurationMs":3500,"maxSymmetryDifferenceRatio":0.45}'::jsonb,
      array['Tempo', 'Symmetry']
    );
  end if;
end $$;
