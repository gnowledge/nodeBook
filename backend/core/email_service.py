"""
Email service for NodeBook authentication system.
Handles password reset emails and other email notifications.
"""

import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

EMAIL_FEATURES_ENABLED = os.getenv("EMAIL_FEATURES_ENABLED", "false").lower() == "true"

class EmailService:
    """Email service for sending authentication-related emails."""
    
    def __init__(self):
        self.smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("MAIL_PORT", "587"))
        self.username: Optional[str] = os.getenv("MAIL_USERNAME")
        self.password: Optional[str] = os.getenv("MAIL_PASSWORD")
        self.from_email = os.getenv("MAIL_FROM", "noreply@nodebook.com")
        self.use_tls = os.getenv("MAIL_TLS", "true").lower() == "true"
        self.use_ssl = os.getenv("MAIL_SSL", "false").lower() == "true"
        self.enabled = EMAIL_FEATURES_ENABLED and all([self.username, self.password])
        if not EMAIL_FEATURES_ENABLED:
            logger.info("Email features are disabled by configuration (EMAIL_FEATURES_ENABLED=false)")
        elif not all([self.username, self.password]):
            logger.warning("Email service not fully configured. Password reset emails will not be sent.")
    
    def send_password_reset_email(self, to_email: str, username: str, reset_token: str, 
                                 base_url: str = "http://localhost:3001") -> bool:
        """
        Send password reset email to user.
        
        Args:
            to_email: Recipient email address
            username: User's username
            reset_token: Password reset token
            base_url: Base URL for the application
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not EMAIL_FEATURES_ENABLED:
            logger.info("Email features are disabled. Skipping password reset email.")
            return False
        
        try:
            # Create reset link
            reset_link = f"{base_url}/reset-password?token={reset_token}"
            
            # Email content
            subject = "NodeBook Password Reset Request"
            
            html_content = f"""
            <html>
            <body>
                <h2>NodeBook Password Reset</h2>
                <p>Hello {username},</p>
                <p>You requested a password reset for your NodeBook account.</p>
                <p>Click the link below to reset your password:</p>
                <p><a href="{reset_link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                <p>Or copy and paste this link into your browser:</p>
                <p>{reset_link}</p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request this reset, please ignore this email.</p>
                <br>
                <p>Best regards,<br>NodeBook Team</p>
            </body>
            </html>
            """
            
            text_content = f"""
            NodeBook Password Reset Request
            
            Hello {username},
            
            You requested a password reset for your NodeBook account.
            
            Click the link below to reset your password:
            {reset_link}
            
            This link will expire in 1 hour.
            
            If you didn't request this reset, please ignore this email.
            
            Best regards,
            NodeBook Team
            """
            
            # Send email
            success = self._send_email(to_email, subject, html_content, text_content)
            
            if success:
                logger.info(f"Password reset email sent to {to_email}")
            else:
                logger.error(f"Failed to send password reset email to {to_email}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending password reset email to {to_email}: {str(e)}")
            return False
    
    def send_admin_password_reset_email(self, to_email: str, username: str, 
                                       temp_password: str) -> bool:
        """
        Send admin-initiated password reset email.
        
        Args:
            to_email: Recipient email address
            username: User's username
            temp_password: Temporary password
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not EMAIL_FEATURES_ENABLED:
            logger.info("Email features are disabled. Skipping admin password reset email.")
            return False
        
        try:
            subject = "NodeBook Account Password Reset"
            
            html_content = f"""
            <html>
            <body>
                <h2>NodeBook Account Password Reset</h2>
                <p>Hello {username},</p>
                <p>An administrator has reset your NodeBook account password.</p>
                <p>Your temporary password is: <strong>{temp_password}</strong></p>
                <p><strong>Please login and change your password immediately.</strong></p>
                <br>
                <p>Best regards,<br>NodeBook Team</p>
            </body>
            </html>
            """
            
            text_content = f"""
            NodeBook Account Password Reset
            
            Hello {username},
            
            An administrator has reset your NodeBook account password.
            
            Your temporary password is: {temp_password}
            
            Please login and change your password immediately.
            
            Best regards,
            NodeBook Team
            """
            
            # Send email
            success = self._send_email(to_email, subject, html_content, text_content)
            
            if success:
                logger.info(f"Admin password reset email sent to {to_email}")
            else:
                logger.error(f"Failed to send admin password reset email to {to_email}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending admin password reset email to {to_email}: {str(e)}")
            return False
    
    def _send_email(self, to_email: str, subject: str, html_content: str, 
                   text_content: str) -> bool:
        """
        Send email using SMTP.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email content
            text_content: Plain text email content
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not EMAIL_FEATURES_ENABLED:
            logger.info("Email features are disabled. Skipping actual email send.")
            return False
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email
            
            # Attach parts
            text_part = MIMEText(text_content, 'plain')
            html_part = MIMEText(html_content, 'html')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Connect to SMTP server
            if self.use_ssl:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            
            if self.use_tls and not self.use_ssl:
                server.starttls()
            
            # Login
            if self.username and self.password:
                server.login(str(self.username), str(self.password))
            else:
                raise ValueError("Email credentials not configured")
            
            # Send email
            server.send_message(msg)
            server.quit()
            
            return True
            
        except Exception as e:
            logger.error(f"SMTP error: {str(e)}")
            return False
    
    def test_connection(self) -> bool:
        """
        Test email service connection.
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        if not EMAIL_FEATURES_ENABLED:
            logger.info("Email features are disabled. Skipping email connection test.")
            return False
        
        try:
            if self.use_ssl:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            
            if self.use_tls and not self.use_ssl:
                server.starttls()
            
            server.login(self.username, self.password)
            server.quit()
            
            logger.info("Email service connection test successful")
            return True
            
        except Exception as e:
            logger.error(f"Email service connection test failed: {str(e)}")
            return False

# Global email service instance
email_service = EmailService() 