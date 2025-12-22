// ProfileModal - Profile modal for viewing profile and changing password
class ProfileModal {
    constructor(firebaseManager, onSignOut = null) {
        this.firebaseManager = firebaseManager;
        this.onSignOut = onSignOut;
        this.modal = document.getElementById('profileModal');
        
        // Profile elements
        this.emailDisplay = document.getElementById('profileEmail');
        this.currentPasswordInput = document.getElementById('profileCurrentPassword');
        this.newPasswordInput = document.getElementById('profileNewPassword');
        this.confirmPasswordInput = document.getElementById('profileConfirmPassword');
        this.changePasswordBtn = document.getElementById('profileChangePasswordBtn');
        this.changePasswordError = document.getElementById('profileChangePasswordError');
        this.changePasswordSuccess = document.getElementById('profileChangePasswordSuccess');
        this.logoutBtn = document.getElementById('profileLogoutBtn');
        this.closeBtn = document.getElementById('profileModalClose');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Change password form
        const changePasswordForm = document.getElementById('profileChangePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleChangePassword();
            });
        }
        
        if (this.changePasswordBtn) {
            this.changePasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleChangePassword();
            });
        }

        // Logout button
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', async () => {
                await this.handleLogout();
            });
        }

        // Close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Close on backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });
        }

        // Enter key handling for password change
        if (this.confirmPasswordInput) {
            this.confirmPasswordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleChangePassword();
                }
            });
        }
    }

    show() {
        if (!this.modal) return;
        
        const user = this.firebaseManager.getCurrentUser();
        if (user && this.emailDisplay) {
            this.emailDisplay.textContent = user.email || 'Geen e-mailadres';
        }
        
        // Reset form
        this.clearErrors();
        this.clearSuccess();
        this.resetForm();
        
        this.modal.classList.remove('hidden');
        
        // Focus on current password input
        setTimeout(() => {
            if (this.currentPasswordInput) {
                this.currentPasswordInput.focus();
            }
        }, 100);
    }

    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
        this.clearErrors();
        this.clearSuccess();
        this.resetForm();
    }

    async handleChangePassword() {
        const currentPassword = this.currentPasswordInput?.value;
        const newPassword = this.newPasswordInput?.value;
        const confirmPassword = this.confirmPasswordInput?.value;

        // Validation
        if (!currentPassword) {
            this.showError('Voer je huidige wachtwoord in.');
            return;
        }

        if (!newPassword) {
            this.showError('Voer een nieuw wachtwoord in.');
            return;
        }

        if (newPassword.length < 6) {
            this.showError('Nieuw wachtwoord moet minimaal 6 karakters lang zijn.');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('Nieuwe wachtwoorden komen niet overeen.');
            return;
        }

        // Show loading state
        this.setLoading(true);
        this.clearErrors();
        this.clearSuccess();

        try {
            // First, re-authenticate the user with current password
            const user = this.firebaseManager.getCurrentUser();
            if (!user || !user.email) {
                this.showError('Geen gebruiker ingelogd.');
                this.setLoading(false);
                return;
            }

            // Re-authenticate to verify current password
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            
            await user.reauthenticateWithCredential(credential);

            // Now change the password
            const result = await this.firebaseManager.changePassword(newPassword);
            
            if (result.success) {
                this.showSuccess('Wachtwoord succesvol gewijzigd!');
                this.resetForm();
                // Clear form after 2 seconds
                setTimeout(() => {
                    this.clearSuccess();
                }, 2000);
            } else {
                this.showError(result.error || 'Wachtwoord wijzigen mislukt.');
            }
        } catch (error) {
            console.error('Change password error:', error);
            const errorMessage = this.firebaseManager.getAuthErrorMessage(error.code) || 
                               error.message || 
                               'Er is een fout opgetreden. Probeer het opnieuw.';
            this.showError(errorMessage);
        } finally {
            this.setLoading(false);
        }
    }

    async handleLogout() {
        if (confirm('Weet je zeker dat je wilt uitloggen?')) {
            const result = await this.firebaseManager.signOut();
            
            if (result.success) {
                this.hide();
                if (this.onSignOut) {
                    this.onSignOut();
                }
            } else {
                alert('Uitloggen mislukt: ' + (result.error || 'Onbekende fout'));
            }
        }
    }

    showError(message) {
        if (this.changePasswordError) {
            this.changePasswordError.textContent = message;
            this.changePasswordError.classList.remove('hidden');
        }
        if (this.changePasswordSuccess) {
            this.changePasswordSuccess.classList.add('hidden');
        }
    }

    showSuccess(message) {
        if (this.changePasswordSuccess) {
            this.changePasswordSuccess.textContent = message;
            this.changePasswordSuccess.classList.remove('hidden');
        }
        if (this.changePasswordError) {
            this.changePasswordError.classList.add('hidden');
        }
    }

    clearErrors() {
        if (this.changePasswordError) {
            this.changePasswordError.textContent = '';
            this.changePasswordError.classList.add('hidden');
        }
    }

    clearSuccess() {
        if (this.changePasswordSuccess) {
            this.changePasswordSuccess.textContent = '';
            this.changePasswordSuccess.classList.add('hidden');
        }
    }

    setLoading(loading) {
        if (this.changePasswordBtn) {
            this.changePasswordBtn.disabled = loading;
            if (loading) {
                this.changePasswordBtn.textContent = 'Wijzigen...';
            } else {
                this.changePasswordBtn.textContent = 'Wachtwoord wijzigen';
            }
        }
        if (this.currentPasswordInput) {
            this.currentPasswordInput.disabled = loading;
        }
        if (this.newPasswordInput) {
            this.newPasswordInput.disabled = loading;
        }
        if (this.confirmPasswordInput) {
            this.confirmPasswordInput.disabled = loading;
        }
    }

    resetForm() {
        if (this.currentPasswordInput) {
            this.currentPasswordInput.value = '';
        }
        if (this.newPasswordInput) {
            this.newPasswordInput.value = '';
        }
        if (this.confirmPasswordInput) {
            this.confirmPasswordInput.value = '';
        }
    }
}

