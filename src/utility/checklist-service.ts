import  Checklist  from '../models/checklist.model'; 

export async function checkIfChecklistNameExists(name: string, program_id: string) {
    const existingChecklist = await Checklist.findOne({
        where: {
            name,
            program_id,
            is_deleted: false, 
        },
    });
    return !!existingChecklist;
}
