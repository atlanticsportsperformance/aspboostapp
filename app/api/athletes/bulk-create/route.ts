import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createAndLinkVALDProfile, linkExistingVALDProfile } from '@/lib/vald/create-profile';

interface AthleteInput {
  firstName: string;
  lastName: string;
  email: string;
  birthDate?: string | null;
  sex?: 'M' | 'F' | null;
  positions?: string[];
  playLevel: 'Youth' | 'High School' | 'College' | 'Pro';
  graduationYear?: number | null;
  phone?: string | null;
  createLogin?: boolean;
  password?: string | null;
  linkVALD?: boolean;
  valdProfileId?: string | null;
  linkBlastMotion?: boolean;
  blastUserId?: string | null;
}

interface AthleteResult {
  email: string;
  success: boolean;
  athleteId?: string;
  authAccountCreated?: boolean;
  authAccountLinked?: boolean;
  valdProfileQueued?: boolean;
  valdProfileLinked?: boolean;
  blastMotionLinked?: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only coaches, admins, and super_admins can create athletes
    if (!['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get org_id
    const { data: staffData } = await supabase
      .from('staff')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    let org_id = staffData?.org_id;

    if (!org_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single();

      org_id = orgData?.id || null;
    }

    // Parse request body
    const body = await request.json();
    const { athletes } = body as { athletes: AthleteInput[] };

    if (!athletes || !Array.isArray(athletes) || athletes.length === 0) {
      return NextResponse.json(
        { error: 'Athletes array is required' },
        { status: 400 }
      );
    }

    if (athletes.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 athletes per batch' },
        { status: 400 }
      );
    }

    // Create admin client for auth operations
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const results: AthleteResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process each athlete sequentially
    for (const athleteData of athletes) {
      const result: AthleteResult = {
        email: athleteData.email,
        success: false,
      };

      try {
        // Validate required fields
        if (!athleteData.firstName || !athleteData.lastName || !athleteData.email) {
          result.error = 'Missing required fields';
          failed++;
          results.push(result);
          continue;
        }

        // Check if email already exists
        const { data: existingAthlete } = await supabase
          .from('athletes')
          .select('id')
          .eq('email', athleteData.email)
          .single();

        if (existingAthlete) {
          result.error = 'Email already exists';
          failed++;
          results.push(result);
          continue;
        }

        // Handle auth account creation/linking
        let authUserId: string | null = null;

        // Check if email already has an auth account
        const { data: existingAuthUser } = await adminClient.auth.admin.listUsers();
        const existingUser = existingAuthUser.users.find(
          u => u.email?.toLowerCase() === athleteData.email.toLowerCase()
        );

        if (existingUser) {
          // Auto-link existing auth account
          authUserId = existingUser.id;
          result.authAccountLinked = true;

          // Check if profile exists with athlete role
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, app_role')
            .eq('id', existingUser.id)
            .single();

          if (!existingProfile) {
            // Create profile with athlete role
            await supabase.from('profiles').insert({
              id: existingUser.id,
              email: athleteData.email,
              first_name: athleteData.firstName,
              last_name: athleteData.lastName,
              app_role: 'athlete',
            });
          }
        } else if (athleteData.createLogin && athleteData.password) {
          // Create new auth account
          const { data: newUser, error: createAuthError } = await adminClient.auth.admin.createUser({
            email: athleteData.email,
            password: athleteData.password,
            email_confirm: true,
            user_metadata: {
              first_name: athleteData.firstName,
              last_name: athleteData.lastName,
            },
          });

          if (createAuthError) {
            console.error('Auth creation error:', createAuthError);
            result.error = `Auth error: ${createAuthError.message}`;
            failed++;
            results.push(result);
            continue;
          }

          if (!newUser.user) {
            result.error = 'Failed to create auth account';
            failed++;
            results.push(result);
            continue;
          }

          authUserId = newUser.user.id;
          result.authAccountCreated = true;

          // Create profile
          const { error: profileInsertError } = await supabase.from('profiles').insert({
            id: newUser.user.id,
            email: athleteData.email,
            first_name: athleteData.firstName,
            last_name: athleteData.lastName,
            app_role: 'athlete',
          });

          if (profileInsertError) {
            console.error('Profile creation error:', profileInsertError);
            // Rollback auth account
            await adminClient.auth.admin.deleteUser(newUser.user.id);
            result.error = 'Failed to create profile';
            failed++;
            results.push(result);
            continue;
          }
        }

        // Create athlete record
        const athleteInsert: any = {
          org_id: org_id,
          user_id: authUserId,
          first_name: athleteData.firstName,
          last_name: athleteData.lastName,
          email: athleteData.email,
          play_level: athleteData.playLevel,
          is_active: true,
        };

        if (athleteData.birthDate) athleteInsert.birth_date = athleteData.birthDate;
        if (athleteData.sex) athleteInsert.sex = athleteData.sex;
        if (athleteData.positions && athleteData.positions.length > 0) {
          athleteInsert.primary_position = athleteData.positions[0];
          if (athleteData.positions.length > 1) {
            athleteInsert.secondary_position = athleteData.positions[1];
          }
        }
        if (athleteData.graduationYear) athleteInsert.graduation_year = athleteData.graduationYear;
        if (athleteData.phone) athleteInsert.phone = athleteData.phone;
        if (athleteData.blastUserId) athleteInsert.blast_user_id = athleteData.blastUserId;

        const { data: newAthlete, error: athleteError } = await supabase
          .from('athletes')
          .insert(athleteInsert)
          .select()
          .single();

        if (athleteError || !newAthlete) {
          console.error('Athlete creation error:', athleteError);
          result.error = 'Failed to create athlete record';
          failed++;
          results.push(result);
          continue;
        }

        result.athleteId = newAthlete.id;
        result.success = true;
        successful++;

        // Handle VALD profile
        if (athleteData.linkVALD) {
          try {
            if (athleteData.valdProfileId) {
              // Link existing VALD profile
              await linkExistingVALDProfile(newAthlete.id, athleteData.valdProfileId);
              result.valdProfileLinked = true;
            } else if (athleteData.birthDate) {
              // Create new VALD profile
              await createAndLinkVALDProfile(
                newAthlete.id,
                athleteData.firstName,
                athleteData.lastName,
                athleteData.email,
                athleteData.birthDate,
                athleteData.sex || undefined
              );
              result.valdProfileQueued = true;
            }
          } catch (valdError) {
            console.error('VALD error:', valdError);
            // Don't fail the whole operation, just log it
          }
        }

        // Blast Motion linking
        if (athleteData.linkBlastMotion && athleteData.blastUserId) {
          result.blastMotionLinked = true;
        }

        results.push(result);
      } catch (error) {
        console.error('Error processing athlete:', error);
        result.error = error instanceof Error ? error.message : 'Unknown error';
        failed++;
        results.push(result);
      }
    }

    return NextResponse.json({
      success: successful > 0,
      total: athletes.length,
      successful,
      failed,
      results,
    });
  } catch (error) {
    console.error('Bulk create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
