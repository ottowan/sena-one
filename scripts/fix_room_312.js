
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf-8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRoom312() {
    console.log('Updating Room 312 status to maintenance...');

    // Check current status
    const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_number', '312')
        .single();

    if (fetchError) {
        console.error('Error fetching room 312:', fetchError);
        return;
    }

    console.log('Current status:', room.status);

    // Update status
    const { data: updated, error: updateError } = await supabase
        .from('rooms')
        .update({ status: 'maintenance' })
        .eq('room_number', '312')
        .select();

    if (updateError) {
        console.error('Error updating room:', updateError);
    } else {
        console.log('Update successful:', updated);
    }
}

fixRoom312();
