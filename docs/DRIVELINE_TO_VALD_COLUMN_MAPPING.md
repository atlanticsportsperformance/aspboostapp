# Driveline CSV → VALD Column Name Mapping

## The 6 Composite Metrics (CRITICAL):

| Priority | Driveline CSV Column | VALD Column Name | Test Type | Notes |
|----------|---------------------|------------------|-----------|-------|
| 1 | `net_peak_vertical_force_imtp` | `net_peak_vertical_force_trial_value` | IMTP | **Calculated**: Peak Force - Body Weight |
| 2 | `relative_strength` | `relative_strength_trial_value` | IMTP | **Calculated**: Net Peak Force / Body Weight |
| 3 | `peak_takeoff_force_pp` | `peak_takeoff_force_trial_value` | PPU | Direct from VALD |
| 4 | `peak_takeoff_power_sj` | `peak_takeoff_power_trial_value` | SJ | Direct from VALD |
| 5 | `peak_power_per_bw_sj` | `bodymass_relative_takeoff_power_trial_value` | SJ | Direct from VALD |
| 6 | `best_rsi_flight_contact_ht` | `hop_mean_rsi_trial_value` | HJ | Direct from VALD |

## Additional Useful Metrics:

### CMJ Metrics
| Driveline CSV Column | VALD Column Name |
|---------------------|------------------|
| `jump_height_cmj` | `jump_height_trial_value` |
| `peak_takeoff_power_cmj` | `peak_takeoff_power_trial_value` |
| `peak_power_per_bw_cmj` | `bodymass_relative_takeoff_power_trial_value` |
| `cmj_stiffness` | `stiffness_trial_value` |
| `eccentric_braking_rfd_cmj` | `eccentric_braking_rfd_trial_value` |
| `eccentric_duration_cmj` | `eccentric_duration_trial_value` |
| `concentric_duration_cmj` | `concentric_duration_trial_value` |
| `rsi_modified_cmj` | `rsi_modified_trial_value` |
| `countermovement_depth_cmj` | `countermovement_depth_trial_value` |
| `concentric_peak_force_cmj` | `concentric_peak_force_trial_value` |
| `eccentric_peak_force_cmj` | `eccentric_peak_force_trial_value` |
| `min_eccentric_force_cmj` | `eccentric_minimum_force_trial_value` |

### CMJ Asymmetry Metrics
| Driveline CSV Column | VALD Column Name |
|---------------------|------------------|
| `cmj_stiffness_asymmetry` | `stiffness_asymm_value` |
| `eccentric_decel_impulse_asymmetry` | `eccentric_deceleration_impulse_asymm_value` |
| `p1_concentric_impulse_asymmetry_cmj` | `contraction_impulse_asymm_value` |
| `p2_concentric_impulse_asymmetry_cmj` | `concentric_impulse_asymm_value` |

### SJ Metrics
| Driveline CSV Column | VALD Column Name |
|---------------------|------------------|
| `jump_height_sj` | `jump_height_trial_value` |
| `peak_takeoff_power_sj` | `peak_takeoff_power_trial_value` |
| `peak_power_per_bw_sj` | `bodymass_relative_takeoff_power_trial_value` |
| `p1_concentric_impulse_asymmetry_sj` | `contraction_impulse_asymm_value` |
| `p2_concentric_impulse_asymmetry_sj` | `concentric_impulse_asymm_value` |

### IMTP Metrics
| Driveline CSV Column | VALD Column Name |
|---------------------|------------------|
| `peak_vertical_force_imtp` | `peak_vertical_force_trial_value` |
| `net_peak_vertical_force_imtp` | `net_peak_vertical_force_trial_value` |
| `relative_strength` | `relative_strength_trial_value` |
| `force_at_100ms_imtp` | `force_at_100_trial_value` |
| `force_at_150ms_imtp` | `force_at_150_trial_value` |
| `force_at_200ms_imtp` | `force_at_200_trial_value` |

### HJ (Hop Test) Metrics
| Driveline CSV Column | VALD Column Name |
|---------------------|------------------|
| `best_active_stiffness_ht` | `hop_mean_stiffness_trial_value` |
| `best_jump_height_ht` | `hop_mean_jump_height_trial_value` |
| `best_rsi_flight_contact_ht` | `hop_mean_rsi_trial_value` |
| `best_rsi_jump_height_contact_ht` | `hop_mean_contact_time_trial_value` |

### PPU (Prone Push-Up) Metrics
| Driveline CSV Column | VALD Column Name |
|---------------------|------------------|
| `peak_takeoff_force_pp` | `peak_takeoff_force_trial_value` |
| `peak_eccentric_force_pp` | `peak_eccentric_force_trial_value` |
| `peak_takeoff_force_asymmetry_pp` | `peak_takeoff_force_asymm_value` |
| `peak_eccentric_force_asymmetry_pp` | `peak_eccentric_force_asymm_value` |

## Non-ForceDecks Columns (Keep as-is):

| Driveline CSV Column | Keep Original Name |
|---------------------|-------------------|
| `test_date` | `test_date` |
| `athlete_name` | `athlete_name` |
| `playing_level` | `playing_level` |
| `body_weight_lbs` | `body_weight_lbs` |
| `athlete_uid` | `athlete_uid` |
| `bat_speed_mph_group` | `bat_speed_mph_group` |
| `pitch_speed_mph_group` | `pitch_speed_mph_group` |
| `t_spine_rom_r` | `t_spine_rom_r` |
| `t_spine_rom_l` | `t_spine_rom_l` |
| `shoulder_er_l` | `shoulder_er_l` |
| `shoulder_er_r` | `shoulder_er_r` |
| `shoulder_ir_l` | `shoulder_ir_l` |
| `shoulder_ir_r` | `shoulder_ir_r` |
| `pitching_session_date` | `pitching_session_date` |
| `pitch_speed_mph` | `pitch_speed_mph` |
| `pitching_max_hss` | `pitching_max_hss` |
| `hitting_session_date` | `hitting_session_date` |
| `bat_speed_mph` | `bat_speed_mph` |
| `hitting_max_hss` | `hitting_max_hss` |

## Usage in Code:

When loading CSV data, use this mapping to rename columns before inserting into `driveline_seed_data` table.

When storing athlete contributions, use same VALD column names.

No translation needed when calculating percentiles!
