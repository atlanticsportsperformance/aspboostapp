import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile and check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role')
      .eq('id', user.id)
      .single();

    if (!profile || !['coach', 'admin', 'super_admin'].includes(profile.app_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, sendViaEmail = false } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create admin client for magic link generation
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

    if (sendViaEmail) {
      // Send magic link via email
      const { error: magicLinkError } = await adminClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        }
      });

      if (magicLinkError) {
        console.error('Error sending magic link:', magicLinkError);
        return NextResponse.json(
          { error: `Failed to send magic link: ${magicLinkError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Magic link sent via email'
      });
    } else {
      // Generate magic link without sending email
      const { data, error: magicLinkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        }
      });

      if (magicLinkError || !data.properties?.action_link) {
        console.error('Error generating magic link:', magicLinkError);
        return NextResponse.json(
          { error: `Failed to generate magic link: ${magicLinkError?.message || 'No link returned'}` },
          { status: 500 }
        );
      }

      // Calculate expiry time (1 hour from now)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      return NextResponse.json({
        success: true,
        magicLink: data.properties.action_link,
        expiresAt,
        message: 'Magic link generated successfully'
      });
    }

  } catch (error) {
    console.error('Unexpected error generating magic link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
