-- Run once against an existing pup_workload database before deploying the new UI.
ALTER TABLE `program_subjects`
    ADD COLUMN `lec_units` INT NOT NULL DEFAULT 0,
    ADD COLUMN `lab_units` INT NOT NULL DEFAULT 0;

-- Existing units-only subjects are treated as lecture hours for compatibility.
UPDATE `program_subjects`
SET `lec_units` = `units`, `lab_units` = 0
WHERE `lec_units` = 0 AND `lab_units` = 0 AND `units` > 0;

UPDATE `program_subjects`
SET `units` = `lec_units` + `lab_units`;

ALTER TABLE `loads`
    ADD COLUMN `component_type` VARCHAR(10) NOT NULL DEFAULT 'Lec';

ALTER TABLE `program_subjects`
    MODIFY COLUMN `semester` VARCHAR(50) NULL,
    ADD COLUMN `is_bridging` TINYINT(1) NOT NULL DEFAULT 0;