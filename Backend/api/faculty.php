<?php
require __DIR__ . '/common.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $rows = db()->query('SELECT * FROM faculty ORDER BY name')->fetchAll();
        jsonOut(array_map(fn ($row) => normalizeFacultyRow($row), $rows));
    }

    if ($method === 'POST') {
        requireAuth();
        $data = readJsonBody();
        $id = trim((string)($data['id'] ?? ''));
        $name = trim((string)($data['name'] ?? ''));

        if ($id === '' || $name === '') {
            jsonOut(['success' => false, 'error' => 'Missing faculty ID or Name'], 400);
        }

        $sql = 'INSERT INTO faculty (
            id, name, base_designation, program, employment_type, classification, classification_rank, active,
            baccalaureate, masters, doctorate, post_baccalaureate, license_number, specialization, national_certificate,
            gen_ed, core_subject, professional_subject, technical_subject,
            research_production, research_presentation, research_publication, research_citation,
            extension, nature_of_appointment, preferred_subjects, preferred_times, remarks
        ) VALUES (
            :id, :name, :base_designation, :program, :employment_type, :classification, :classification_rank, :active,
            :baccalaureate, :masters, :doctorate, :post_baccalaureate, :license_number, :specialization, :national_certificate,
            :gen_ed, :core_subject, :professional_subject, :technical_subject,
            :research_production, :research_presentation, :research_publication, :research_citation,
            :extension, :nature_of_appointment, :preferred_subjects, :preferred_times, :remarks
        ) ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            base_designation = VALUES(base_designation),
            program = VALUES(program),
            employment_type = VALUES(employment_type),
            classification = VALUES(classification),
            classification_rank = VALUES(classification_rank),
            active = VALUES(active),
            baccalaureate = VALUES(baccalaureate),
            masters = VALUES(masters),
            doctorate = VALUES(doctorate),
            post_baccalaureate = VALUES(post_baccalaureate),
            license_number = VALUES(license_number),
            specialization = VALUES(specialization),
            national_certificate = VALUES(national_certificate),
            gen_ed = VALUES(gen_ed),
            core_subject = VALUES(core_subject),
            professional_subject = VALUES(professional_subject),
            technical_subject = VALUES(technical_subject),
            research_production = VALUES(research_production),
            research_presentation = VALUES(research_presentation),
            research_publication = VALUES(research_publication),
            research_citation = VALUES(research_citation),
            extension = VALUES(extension),
            nature_of_appointment = VALUES(nature_of_appointment),
            preferred_subjects = VALUES(preferred_subjects),
            preferred_times = VALUES(preferred_times),
            remarks = VALUES(remarks)';

        $edu = $data['educationalAttainment'] ?? [];
        $course = $data['courseHandle'] ?? [];
        $research = $data['research'] ?? [];

        $statement = db()->prepare($sql);
        $statement->execute([
            ':id' => $id,
            ':name' => $name,
            ':base_designation' => $data['baseDesignation'] ?? '',
            ':program' => $data['program'] ?? '',
            ':employment_type' => $data['employmentType'] ?? '',
            ':classification' => $data['classification'] ?? '',
            ':classification_rank' => $data['classificationRank'] ?? '',
            ':active' => isset($data['active']) ? (int)(bool)$data['active'] : 1,
            ':baccalaureate' => $edu['baccalaureate'] ?? '',
            ':masters' => $edu['masters'] ?? '',
            ':doctorate' => $edu['doctorate'] ?? '',
            ':post_baccalaureate' => $edu['postBaccalaureate'] ?? '',
            ':license_number' => $data['licenseNumber'] ?? '',
            ':specialization' => $data['specialization'] ?? '',
            ':national_certificate' => $data['nationalCertificate'] ?? '',
            ':gen_ed' => $course['genEd'] ?? '',
            ':core_subject' => $course['coreSubject'] ?? '',
            ':professional_subject' => $course['professionalSubject'] ?? '',
            ':technical_subject' => $course['technicalSubject'] ?? '',
            ':research_production' => $research['production'] ?? '0',
            ':research_presentation' => $research['presentation'] ?? '0',
            ':research_publication' => $research['publication'] ?? '0',
            ':research_citation' => $research['citation'] ?? '0',
            ':extension' => $data['extension'] ?? '',
            ':nature_of_appointment' => $data['natureOfAppointment'] ?? '',
            ':preferred_subjects' => $data['preferredSubjects'] ?? '',
            ':preferred_times' => $data['preferredTimes'] ?? '',
            ':remarks' => $data['remarks'] ?? '',
        ]);

        jsonOut(['success' => true]);
    }

    jsonOut(['success' => false, 'error' => 'Unsupported method'], 405);
} catch (Throwable $e) {
    jsonOut(['success' => false, 'error' => $e->getMessage()], 500);
}
