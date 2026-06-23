const supabase = require('../../config/supabase');

// Member submits (or resubmits) their identity document → status becomes 'pending'
async function submitDocument({ memberId, idDocumentUrl, fullName, phone }) {
  const update = {
    id_document_url: idDocumentUrl,
    verification_status: 'pending',
    updated_at: new Date().toISOString(),
  };
  if (fullName) update.full_name = fullName;
  if (phone) update.phone = phone;

  const { data, error } = await supabase
    .from('members')
    .update(update)
    .eq('id', memberId)
    .in('verification_status', ['unverified', 'rejected']) // can't resubmit once verified
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Sysadmin: list members by verification status (default: pending queue)
async function listForReview(status = 'pending') {
  const { data, error } = await supabase
    .from('members')
    .select('id, full_name, email, phone, id_document_url, verification_status, created_at')
    .eq('verification_status', status)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

async function getMember(id) {
  const { data, error } = await supabase
    .from('members').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

// Sysadmin approves a member
async function approveMember({ memberId, reviewerId }) {
  const { data, error } = await supabase
    .from('members')
    .update({
      verification_status: 'verified',
      verified_by: reviewerId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .eq('verification_status', 'pending')
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Sysadmin rejects a member (they may resubmit)
async function rejectMember({ memberId }) {
  const { data, error } = await supabase
    .from('members')
    .update({ verification_status: 'rejected' })
    .eq('id', memberId)
    .eq('verification_status', 'pending')
    .select()
    .single();
  if (error) throw error;
  return data;
}

// The current member's own profile + status
async function getMyProfile(memberId) {
  return getMember(memberId);
}

module.exports = {
  submitDocument, listForReview, getMember,
  approveMember, rejectMember, getMyProfile,
};